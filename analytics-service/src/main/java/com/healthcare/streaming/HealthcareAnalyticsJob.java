package com.healthcare.streaming;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.time.Duration;
import java.util.Properties;

public class HealthcareAnalyticsJob {
    
    private static final String BOOTSTRAP_SERVERS = "pkc-n3603.us-central1.gcp.confluent.cloud:9092";
    private static final String API_KEY = "5HZVK6RALIEABGQ7";
    private static final String API_SECRET = "cfltjYDTVRfdDTwLdRxWNzmEVWC8GNxG1/Jqu3JnOAbWF5hHZvACOJf48qH7uygA";
    private static final String INPUT_TOPIC = "appointment-events";
    private static final String OUTPUT_TOPIC = "analytics-results";
    
    public static void main(String[] args) throws Exception {
        // Set up the streaming execution environment
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Configure Kafka Source
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(BOOTSTRAP_SERVERS)
                .setTopics(INPUT_TOPIC)
                .setGroupId("healthcare-analytics-group")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .setProperties(getKafkaSecurityProperties())
                .build();
        
        // Create data stream from Kafka source
        DataStream<String> appointmentStream = env.fromSource(
                source,
                WatermarkStrategy.forBoundedOutOfOrderness(Duration.ofSeconds(5)),
                "Kafka Appointment Source"
        );
        
        // Parse and validate appointment events
        DataStream<AppointmentEvent> parsedStream = appointmentStream
                .map(HealthcareAnalyticsJob::parseAppointmentEvent)
                .filter(event -> event != null);
        
        // Calculate cumulative metrics with state
        DataStream<String> analyticsStream = parsedStream
                .keyBy(event -> "global") // Single key for global state
                .process(new CumulativeMetricsFunction())
                .map(HealthcareAnalyticsJob::createAnalyticsInsight);
        
        // Configure Kafka Sink
        KafkaSink<String> sink = KafkaSink.<String>builder()
                .setBootstrapServers(BOOTSTRAP_SERVERS)
                .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                        .setTopic(OUTPUT_TOPIC)
                        .setValueSerializationSchema(new SimpleStringSchema())
                        .build()
                )
                .setKafkaProducerConfig(getKafkaSecurityProperties())
                .build();
        
        // Write to Kafka sink
        analyticsStream.sinkTo(sink);
        
        // Execute the Flink job
        env.execute("Healthcare Analytics Job");
    }
    
    private static Properties getKafkaSecurityProperties() {
        Properties props = new Properties();
        props.setProperty("security.protocol", "SASL_SSL");
        props.setProperty("sasl.mechanism", "PLAIN");
        props.setProperty("sasl.jaas.config", String.format(
                "org.apache.kafka.common.security.plain.PlainLoginModule required username=\"%s\" password=\"%s\";",
                API_KEY, API_SECRET
        ));
        return props;
    }
    
    private static AppointmentEvent parseAppointmentEvent(String json) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(json);
            
            AppointmentEvent eventObj = new AppointmentEvent(
                node.get("event").asText(),
                node.get("appointmentId").asLong(),
                node.get("patientId").asText(),
                node.get("doctorId").asText(),
                node.get("time").asText()
            );

            System.out.println("RECEIVED APPOINTMENT EVENT: " + mapper.writeValueAsString(node));

            return eventObj;
        } catch (Exception e) {
            System.err.println("Error parsing appointment event: " + e.getMessage());
            return null;
        }
    }
    
    private static String createAnalyticsInsight(AppointmentMetrics metrics) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode insight = mapper.createObjectNode();
            
            insight.put("metricType", "AppointmentAnalytics");
            insight.put("totalEventsCreated", metrics.totalEvents);
            insight.put("avgAppointmentsPerHour", metrics.avgPerHour);
            insight.put("windowStartTime", metrics.windowStart);
            insight.put("windowEndTime", metrics.windowEnd);
            insight.put("timestamp", System.currentTimeMillis());
            
            String out = mapper.writeValueAsString(insight);

            System.out.println("SENDING ANALYTICS RESULT: " + out);

            return out;
        } catch (Exception e) {
            System.err.println("Error creating analytics insight: " + e.getMessage());
            return "{}";
        }
    }
    
    // KeyedProcessFunction for cumulative metrics with state
    public static class CumulativeMetricsFunction 
            extends KeyedProcessFunction<String, AppointmentEvent, AppointmentMetrics> {
        
        private transient ValueState<Long> cumulativeCount;
        private transient ValueState<Long> windowStart;
        private transient ValueState<Long> windowCount;
        
        @Override
        public void open(Configuration parameters) {
            cumulativeCount = getRuntimeContext().getState(
                new ValueStateDescriptor<>("cumulative", Long.class, 0L));
            windowStart = getRuntimeContext().getState(
                new ValueStateDescriptor<>("windowStart", Long.class, 0L));
            windowCount = getRuntimeContext().getState(
                new ValueStateDescriptor<>("windowCount", Long.class, 0L));
        }
        
        @Override
        public void processElement(
                AppointmentEvent event, 
                Context ctx, 
                Collector<AppointmentMetrics> out) throws Exception {
            
            long now = System.currentTimeMillis();
            
            // Update cumulative count
            long cumulative = cumulativeCount.value() + 1;
            cumulativeCount.update(cumulative);
            
            // Window logic for hourly rate (reset every hour)
            long windowStartTime = windowStart.value();
            if (windowStartTime == 0) {
                // First event - initialize the window
                windowStart.update(now);
                windowCount.update(1L);
                windowStartTime = now; // Update local variable too
            } else if (now - windowStartTime > 3600000) { // 1 hour has passed
                // Reset window
                windowStart.update(now);
                windowCount.update(1L);
                windowStartTime = now;
            } else {
                // Increment count in current window
                windowCount.update(windowCount.value() + 1);
            }
            
            // Calculate hourly rate
            long elapsedMillis = now - windowStartTime;
            double elapsedHours = Math.max(0.001, elapsedMillis / 3600000.0); // Prevent divide by zero
            double avgPerHour = windowCount.value() / elapsedHours;
            
            AppointmentMetrics metrics = new AppointmentMetrics(
                cumulative,
                avgPerHour,
                windowStartTime,
                now
            );
            
            System.out.println("ANALYTICS: totalEvents=" + cumulative + 
                             " (previous: " + (cumulative - 1) + 
                             "), avgPerHour=" + String.format("%.2f", avgPerHour));
            
            out.collect(metrics);
        }
    }
    
    // Data classes
    public static class AppointmentEvent {
        public String event;
        public long appointmentId;
        public String patientId;
        public String doctorId;
        public String time;
        
        public AppointmentEvent(String event, long appointmentId, String patientId, 
                               String doctorId, String time) {
            this.event = event;
            this.appointmentId = appointmentId;
            this.patientId = patientId;
            this.doctorId = doctorId;
            this.time = time;
        }
    }
    
    public static class AppointmentMetrics {
        public long totalEvents;
        public double avgPerHour;
        public long windowStart;
        public long windowEnd;
        
        public AppointmentMetrics(long totalEvents, double avgPerHour, 
                                 long windowStart, long windowEnd) {
            this.totalEvents = totalEvents;
            this.avgPerHour = avgPerHour;
            this.windowStart = windowStart;
            this.windowEnd = windowEnd;
        }
    }
}