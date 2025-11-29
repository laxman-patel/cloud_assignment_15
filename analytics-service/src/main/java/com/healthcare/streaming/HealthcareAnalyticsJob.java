package com.healthcare.streaming;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
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
        
        // Calculate metrics with 1-hour tumbling windows
        DataStream<String> analyticsStream = parsedStream
                .windowAll(TumblingProcessingTimeWindows.of(Time.minutes(1)))
                .aggregate(new AppointmentMetricsAggregator())
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

// print outgoing analytics payload
System.out.println("SENDING ANALYTICS RESULT: " + out);

return out;
        } catch (Exception e) {
            System.err.println("Error creating analytics insight: " + e.getMessage());
            return "{}";
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
    
    // Aggregate function for calculating metrics
    public static class AppointmentMetricsAggregator 
            implements AggregateFunction<AppointmentEvent, MetricsAccumulator, AppointmentMetrics> {
        
        @Override
        public MetricsAccumulator createAccumulator() {
            return new MetricsAccumulator();
        }
        
        @Override
        public MetricsAccumulator add(AppointmentEvent event, MetricsAccumulator acc) {
            acc.count++;
            if (acc.windowStart == 0) {
                acc.windowStart = System.currentTimeMillis();
            }
            return acc;
        }
        
        @Override
        public AppointmentMetrics getResult(MetricsAccumulator acc) {
            acc.windowEnd = System.currentTimeMillis();
            double avgPerHour = acc.count; // Already calculated per hour window
            return new AppointmentMetrics(acc.count, avgPerHour, 
                                         acc.windowStart, acc.windowEnd);
        }
        
        @Override
        public MetricsAccumulator merge(MetricsAccumulator a, MetricsAccumulator b) {
            MetricsAccumulator merged = new MetricsAccumulator();
            merged.count = a.count + b.count;
            merged.windowStart = Math.min(a.windowStart, b.windowStart);
            return merged;
        }
    }
    
    public static class MetricsAccumulator {
        public long count = 0;
        public long windowStart = 0;
        public long windowEnd = 0;
    }
}