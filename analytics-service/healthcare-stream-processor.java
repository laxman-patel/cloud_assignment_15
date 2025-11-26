package com.healthcare.streaming;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.api.java.tuple.Tuple3;
import org.apache.flink.cep.CEP;
import org.apache.flink.cep.PatternSelectFunction;
import org.apache.flink.cep.PatternStream;
import org.apache.flink.cep.pattern.Pattern;
import org.apache.flink.cep.pattern.conditions.SimpleCondition;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.KeyedStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.co.KeyedCoProcessFunction;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.assigners.EventTimeSessionWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Healthcare Stream Processing Application using Apache Flink on Google Cloud Dataproc
 * 
 * Features:
 * - Multi-stream interval joins (Appointment + Billing)
 * - Complex Event Processing (CEP) for patient dropout detection
 * - Multiple windowing strategies (Tumbling, Sliding, Session)
 * - Exactly-once semantics with checkpointing to GCS
 * - Scalable with configurable parallelism
 */
public class HealthcareStreamProcessor {

    // Configuration constants
    private static final String KAFKA_BOOTSTRAP_SERVERS = "your-kafka-broker:9092";
    private static final String APPOINTMENT_TOPIC = "appointment-events";
    private static final String BILLING_TOPIC = "billing-events";
    private static final String LAB_RESULT_TOPIC = "lab-result-events";
    private static final String ANALYTICS_TOPIC = "analytics-insights";
    private static final String GCS_CHECKPOINT_PATH = "gs://your-bucket/checkpoints";
    private static final int PARALLELISM = 4;

    public static void main(String[] args) throws Exception {
        
        // Setup Flink execution environment
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Configure checkpointing for exactly-once semantics
        env.enableCheckpointing(60000); // Checkpoint every 60 seconds
        env.getCheckpointConfig().setCheckpointStorage(GCS_CHECKPOINT_PATH);
        env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);
        env.getCheckpointConfig().setCheckpointTimeout(300000);
        env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
        
        // Set parallelism
        env.setParallelism(PARALLELISM);
        
        // Create Kafka sources
        KafkaSource<String> appointmentSource = createKafkaSource(APPOINTMENT_TOPIC, "appointment-consumer-group");
        KafkaSource<String> billingSource = createKafkaSource(BILLING_TOPIC, "billing-consumer-group");
        KafkaSource<String> labResultSource = createKafkaSource(LAB_RESULT_TOPIC, "lab-result-consumer-group");
        
        // Parse appointment events
        DataStream<AppointmentEvent> appointmentStream = env
            .fromSource(appointmentSource, WatermarkStrategy
                .<String>forBoundedOutOfOrderness(Duration.ofSeconds(10))
                .withTimestampAssigner((event, timestamp) -> parseTimestamp(event, "appointmentTime")),
                "Appointment Source")
            .map(new AppointmentParser());
        
        // Parse billing events
        DataStream<BillingEvent> billingStream = env
            .fromSource(billingSource, WatermarkStrategy
                .<String>forBoundedOutOfOrderness(Duration.ofSeconds(10))
                .withTimestampAssigner((event, timestamp) -> parseTimestamp(event, "billingTime")),
                "Billing Source")
            .map(new BillingParser());
        
        // Parse lab result events
        DataStream<LabResultEvent> labResultStream = env
            .fromSource(labResultSource, WatermarkStrategy
                .<String>forBoundedOutOfOrderness(Duration.ofSeconds(10))
                .withTimestampAssigner((event, timestamp) -> parseTimestamp(event, "resultTime")),
                "Lab Result Source")
            .map(new LabResultParser());
        
        // Create Kafka sink
        KafkaSink<String> analyticsSink = createKafkaSink(ANALYTICS_TOPIC);
        
        // ========== FEATURE 1: INTERVAL JOINS ==========
        performIntervalJoin(appointmentStream, billingStream, analyticsSink);
        
        // ========== FEATURE 2: COMPLEX EVENT PROCESSING ==========
        detectPatientDropouts(appointmentStream, labResultStream, analyticsSink);
        
        // ========== FEATURE 3: WINDOWING STRATEGIES ==========
        
        // Tumbling Windows: Hourly Revenue
        calculateHourlyRevenue(billingStream, analyticsSink);
        
        // Sliding Windows: Average Wait Time
        calculateSlidingAverageWaitTime(appointmentStream, analyticsSink);
        
        // Session Windows: Patient Journey
        trackPatientJourney(appointmentStream, analyticsSink);
        
        // Execute the job
        env.execute("Healthcare Stream Processing Application");
    }
    
    /**
     * Feature 1: Interval Join between Appointment and Billing streams
     * Joins appointments with billing events within 24 hours
     */
    private static void performIntervalJoin(
            DataStream<AppointmentEvent> appointmentStream,
            DataStream<BillingEvent> billingStream,
            KafkaSink<String> sink) {
        
        KeyedStream<AppointmentEvent, String> keyedAppointments = 
            appointmentStream.keyBy(AppointmentEvent::getAppointmentId);
        
        KeyedStream<BillingEvent, String> keyedBilling = 
            billingStream.keyBy(BillingEvent::getAppointmentId);
        
        // Perform interval join with custom state management
        DataStream<String> joinedStream = keyedAppointments
            .connect(keyedBilling)
            .process(new IntervalJoinFunction())
            .name("Appointment-Billing Interval Join");
        
        joinedStream.sinkTo(sink).name("Joined Events Sink");
    }
    
    /**
     * Feature 2: Complex Event Processing to detect patient dropouts
     * Pattern: Appointment -> LabResult -> No FollowUp within 7 days
     */
    private static void detectPatientDropouts(
            DataStream<AppointmentEvent> appointmentStream,
            DataStream<LabResultEvent> labResultStream,
            KafkaSink<String> sink) {
        
        // Merge streams and key by patient
        DataStream<PatientEvent> patientEvents = appointmentStream
            .map(a -> new PatientEvent(a.getPatientId(), "APPOINTMENT", a.getTimestamp()))
            .union(labResultStream.map(l -> new PatientEvent(l.getPatientId(), "LAB_RESULT", l.getTimestamp())));
        
        KeyedStream<PatientEvent, String> keyedPatientEvents = 
            patientEvents.keyBy(PatientEvent::getPatientId);
        
        // Define CEP pattern
        Pattern<PatientEvent, ?> dropoutPattern = Pattern
            .<PatientEvent>begin("appointment")
            .where(new SimpleCondition<PatientEvent>() {
                @Override
                public boolean filter(PatientEvent event) {
                    return event.getEventType().equals("APPOINTMENT");
                }
            })
            .next("labResult")
            .where(new SimpleCondition<PatientEvent>() {
                @Override
                public boolean filter(PatientEvent event) {
                    return event.getEventType().equals("LAB_RESULT");
                }
            })
            .notFollowedBy("followUp")
            .where(new SimpleCondition<PatientEvent>() {
                @Override
                public boolean filter(PatientEvent event) {
                    return event.getEventType().equals("APPOINTMENT");
                }
            })
            .within(Time.days(7));
        
        PatternStream<PatientEvent> patternStream = CEP.pattern(keyedPatientEvents, dropoutPattern);
        
        DataStream<String> dropoutAlerts = patternStream.select(new PatternSelectFunction<PatientEvent, String>() {
            @Override
            public String select(Map<String, List<PatientEvent>> pattern) throws Exception {
                PatientEvent appointment = pattern.get("appointment").get(0);
                PatientEvent labResult = pattern.get("labResult").get(0);
                
                ObjectMapper mapper = new ObjectMapper();
                ObjectNode alert = mapper.createObjectNode();
                alert.put("type", "PATIENT_DROPOUT_ALERT");
                alert.put("patientId", appointment.getPatientId());
                alert.put("appointmentTime", appointment.getTimestamp());
                alert.put("labResultTime", labResult.getTimestamp());
                alert.put("message", "Patient has not booked follow-up appointment within 7 days");
                
                return mapper.writeValueAsString(alert);
            }
        });
        
        dropoutAlerts.sinkTo(sink).name("Dropout Alerts Sink");
    }
    
    /**
     * Feature 3a: Tumbling Windows for hourly revenue calculation
     */
    private static void calculateHourlyRevenue(
            DataStream<BillingEvent> billingStream,
            KafkaSink<String> sink) {
        
        DataStream<String> hourlyRevenue = billingStream
            .keyBy(BillingEvent::getDepartmentId)
            .window(TumblingEventTimeWindows.of(Time.hours(1)))
            .process(new ProcessWindowFunction<BillingEvent, String, String, TimeWindow>() {
                @Override
                public void process(String departmentId, Context context, 
                                  Iterable<BillingEvent> elements, Collector<String> out) throws Exception {
                    double totalRevenue = 0.0;
                    int count = 0;
                    
                    for (BillingEvent event : elements) {
                        totalRevenue += event.getAmount();
                        count++;
                    }
                    
                    ObjectMapper mapper = new ObjectMapper();
                    ObjectNode result = mapper.createObjectNode();
                    result.put("type", "HOURLY_REVENUE");
                    result.put("departmentId", departmentId);
                    result.put("windowStart", context.window().getStart());
                    result.put("windowEnd", context.window().getEnd());
                    result.put("totalRevenue", totalRevenue);
                    result.put("transactionCount", count);
                    
                    out.collect(mapper.writeValueAsString(result));
                }
            })
            .name("Hourly Revenue Calculation");
        
        hourlyRevenue.sinkTo(sink).name("Hourly Revenue Sink");
    }
    
    /**
     * Feature 3b: Sliding Windows for average wait time
     */
    private static void calculateSlidingAverageWaitTime(
            DataStream<AppointmentEvent> appointmentStream,
            KafkaSink<String> sink) {
        
        DataStream<String> avgWaitTime = appointmentStream
            .keyBy(AppointmentEvent::getDepartmentId)
            .window(SlidingEventTimeWindows.of(Time.minutes(15), Time.minutes(1)))
            .process(new ProcessWindowFunction<AppointmentEvent, String, String, TimeWindow>() {
                @Override
                public void process(String departmentId, Context context,
                                  Iterable<AppointmentEvent> elements, Collector<String> out) throws Exception {
                    double totalWaitTime = 0.0;
                    int count = 0;
                    
                    for (AppointmentEvent event : elements) {
                        totalWaitTime += event.getWaitTimeMinutes();
                        count++;
                    }
                    
                    if (count > 0) {
                        ObjectMapper mapper = new ObjectMapper();
                        ObjectNode result = mapper.createObjectNode();
                        result.put("type", "AVERAGE_WAIT_TIME");
                        result.put("departmentId", departmentId);
                        result.put("windowStart", context.window().getStart());
                        result.put("windowEnd", context.window().getEnd());
                        result.put("avgWaitTimeMinutes", totalWaitTime / count);
                        result.put("appointmentCount", count);
                        
                        out.collect(mapper.writeValueAsString(result));
                    }
                }
            })
            .name("Sliding Average Wait Time");
        
        avgWaitTime.sinkTo(sink).name("Average Wait Time Sink");
    }
    
    /**
     * Feature 3c: Session Windows for patient journey tracking
     */
    private static void trackPatientJourney(
            DataStream<AppointmentEvent> appointmentStream,
            KafkaSink<String> sink) {
        
        DataStream<String> patientJourneys = appointmentStream
            .keyBy(AppointmentEvent::getPatientId)
            .window(EventTimeSessionWindows.withGap(Time.hours(2)))
            .process(new ProcessWindowFunction<AppointmentEvent, String, String, TimeWindow>() {
                @Override
                public void process(String patientId, Context context,
                                  Iterable<AppointmentEvent> elements, Collector<String> out) throws Exception {
                    int appointmentCount = 0;
                    StringBuilder journey = new StringBuilder();
                    
                    for (AppointmentEvent event : elements) {
                        appointmentCount++;
                        journey.append(event.getDepartmentId()).append(" -> ");
                    }
                    
                    ObjectMapper mapper = new ObjectMapper();
                    ObjectNode result = mapper.createObjectNode();
                    result.put("type", "PATIENT_JOURNEY");
                    result.put("patientId", patientId);
                    result.put("sessionStart", context.window().getStart());
                    result.put("sessionEnd", context.window().getEnd());
                    result.put("appointmentCount", appointmentCount);
                    result.put("journey", journey.toString());
                    
                    out.collect(mapper.writeValueAsString(result));
                }
            })
            .name("Patient Journey Tracking");
        
        patientJourneys.sinkTo(sink).name("Patient Journey Sink");
    }
    
    // ========== HELPER METHODS ==========
    
    private static KafkaSource<String> createKafkaSource(String topic, String groupId) {
        return KafkaSource.<String>builder()
            .setBootstrapServers(KAFKA_BOOTSTRAP_SERVERS)
            .setTopics(topic)
            .setGroupId(groupId)
            .setStartingOffsets(OffsetsInitializer.earliest())
            .setValueOnlyDeserializer(new SimpleStringSchema())
            .build();
    }
    
    private static KafkaSink<String> createKafkaSink(String topic) {
        return KafkaSink.<String>builder()
            .setBootstrapServers(KAFKA_BOOTSTRAP_SERVERS)
            .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                .setTopic(topic)
                .setValueSerializationSchema(new SimpleStringSchema())
                .build())
            .build();
    }
    
    private static long parseTimestamp(String json, String fieldName) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(json);
            return node.get(fieldName).asLong();
        } catch (Exception e) {
            return System.currentTimeMillis();
        }
    }
    
    // ========== CUSTOM PROCESS FUNCTION FOR INTERVAL JOIN ==========
    
    /**
     * Custom KeyedCoProcessFunction to implement interval join with state management
     * Joins appointments with billing events within 24 hours
     */
    static class IntervalJoinFunction extends KeyedCoProcessFunction<String, AppointmentEvent, BillingEvent, String> {
        
        private transient ValueState<AppointmentEvent> appointmentState;
        private transient ValueState<BillingEvent> billingState;
        
        @Override
        public void open(Configuration parameters) {
            appointmentState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("appointment", AppointmentEvent.class));
            billingState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("billing", BillingEvent.class));
        }
        
        @Override
        public void processElement1(AppointmentEvent appointment, Context ctx, Collector<String> out) throws Exception {
            BillingEvent billing = billingState.value();
            
            if (billing != null && isWithin24Hours(appointment.getTimestamp(), billing.getTimestamp())) {
                out.collect(createJoinedEvent(appointment, billing));
                billingState.clear();
            } else {
                appointmentState.update(appointment);
                // Register timer to clean up state after 24 hours
                ctx.timerService().registerEventTimeTimer(appointment.getTimestamp() + 24 * 60 * 60 * 1000);
            }
        }
        
        @Override
        public void processElement2(BillingEvent billing, Context ctx, Collector<String> out) throws Exception {
            AppointmentEvent appointment = appointmentState.value();
            
            if (appointment != null && isWithin24Hours(appointment.getTimestamp(), billing.getTimestamp())) {
                out.collect(createJoinedEvent(appointment, billing));
                appointmentState.clear();
            } else {
                billingState.update(billing);
                // Register timer to clean up state after 24 hours
                ctx.timerService().registerEventTimeTimer(billing.getTimestamp() + 24 * 60 * 60 * 1000);
            }
        }
        
        @Override
        public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {
            // Clean up expired state
            appointmentState.clear();
            billingState.clear();
        }
        
        private boolean isWithin24Hours(long appointmentTime, long billingTime) {
            long diff = Math.abs(billingTime - appointmentTime);
            return diff <= 24 * 60 * 60 * 1000;
        }
        
        private String createJoinedEvent(AppointmentEvent appointment, BillingEvent billing) throws Exception {
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode result = mapper.createObjectNode();
            result.put("type", "JOINED_APPOINTMENT_BILLING");
            result.put("appointmentId", appointment.getAppointmentId());
            result.put("patientId", appointment.getPatientId());
            result.put("departmentId", appointment.getDepartmentId());
            result.put("appointmentTime", appointment.getTimestamp());
            result.put("billingTime", billing.getTimestamp());
            result.put("billingAmount", billing.getAmount());
            result.put("timeDifferenceHours", (billing.getTimestamp() - appointment.getTimestamp()) / (1000.0 * 60 * 60));
            
            return mapper.writeValueAsString(result);
        }
    }
    
    // ========== EVENT CLASSES ==========
    
    static class AppointmentEvent {
        private String appointmentId;
        private String patientId;
        private String departmentId;
        private long timestamp;
        private double waitTimeMinutes;
        
        public AppointmentEvent() {}
        
        public AppointmentEvent(String appointmentId, String patientId, String departmentId, 
                              long timestamp, double waitTimeMinutes) {
            this.appointmentId = appointmentId;
            this.patientId = patientId;
            this.departmentId = departmentId;
            this.timestamp = timestamp;
            this.waitTimeMinutes = waitTimeMinutes;
        }
        
        // Getters and setters
        public String getAppointmentId() { return appointmentId; }
        public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }
        public String getPatientId() { return patientId; }
        public void setPatientId(String patientId) { this.patientId = patientId; }
        public String getDepartmentId() { return departmentId; }
        public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
        public double getWaitTimeMinutes() { return waitTimeMinutes; }
        public void setWaitTimeMinutes(double waitTimeMinutes) { this.waitTimeMinutes = waitTimeMinutes; }
    }
    
    static class BillingEvent {
        private String billingId;
        private String appointmentId;
        private String departmentId;
        private long timestamp;
        private double amount;
        
        public BillingEvent() {}
        
        public BillingEvent(String billingId, String appointmentId, String departmentId, 
                          long timestamp, double amount) {
            this.billingId = billingId;
            this.appointmentId = appointmentId;
            this.departmentId = departmentId;
            this.timestamp = timestamp;
            this.amount = amount;
        }
        
        // Getters and setters
        public String getBillingId() { return billingId; }
        public void setBillingId(String billingId) { this.billingId = billingId; }
        public String getAppointmentId() { return appointmentId; }
        public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }
        public String getDepartmentId() { return departmentId; }
        public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
    }
    
    static class LabResultEvent {
        private String resultId;
        private String patientId;
        private long timestamp;
        private String resultType;
        
        public LabResultEvent() {}
        
        public LabResultEvent(String resultId, String patientId, long timestamp, String resultType) {
            this.resultId = resultId;
            this.patientId = patientId;
            this.timestamp = timestamp;
            this.resultType = resultType;
        }
        
        // Getters and setters
        public String getResultId() { return resultId; }
        public void setResultId(String resultId) { this.resultId = resultId; }
        public String getPatientId() { return patientId; }
        public void setPatientId(String patientId) { this.patientId = patientId; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
        public String getResultType() { return resultType; }
        public void setResultType(String resultType) { this.resultType = resultType; }
    }
    
    static class PatientEvent {
        private String patientId;
        private String eventType;
        private long timestamp;
        
        public PatientEvent() {}
        
        public PatientEvent(String patientId, String eventType, long timestamp) {
            this.patientId = patientId;
            this.eventType = eventType;
            this.timestamp = timestamp;
        }
        
        // Getters and setters
        public String getPatientId() { return patientId; }
        public void setPatientId(String patientId) { this.patientId = patientId; }
        public String getEventType() { return eventType; }
        public void setEventType(String eventType) { this.eventType = eventType; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    }
    
    // ========== PARSER FUNCTIONS ==========
    
    static class AppointmentParser implements MapFunction<String, AppointmentEvent> {
        private transient ObjectMapper mapper;
        
        @Override
        public AppointmentEvent map(String value) throws Exception {
            if (mapper == null) {
                mapper = new ObjectMapper();
            }
            JsonNode node = mapper.readTree(value);
            
            return new AppointmentEvent(
                node.get("appointmentId").asText(),
                node.get("patientId").asText(),
                node.get("departmentId").asText(),
                node.get("appointmentTime").asLong(),
                node.has("waitTimeMinutes") ? node.get("waitTimeMinutes").asDouble() : 0.0
            );
        }
    }
    
    static class BillingParser implements MapFunction<String, BillingEvent> {
        private transient ObjectMapper mapper;
        
        @Override
        public BillingEvent map(String value) throws Exception {
            if (mapper == null) {
                mapper = new ObjectMapper();
            }
            JsonNode node = mapper.readTree(value);
            
            return new BillingEvent(
                node.get("billingId").asText(),
                node.get("appointmentId").asText(),
                node.get("departmentId").asText(),
                node.get("billingTime").asLong(),
                node.get("amount").asDouble()
            );
        }
    }
    
    static class LabResultParser implements MapFunction<String, LabResultEvent> {
        private transient ObjectMapper mapper;
        
        @Override
        public LabResultEvent map(String value) throws Exception {
            if (mapper == null) {
                mapper = new ObjectMapper();
            }
            JsonNode node = mapper.readTree(value);
            
            return new LabResultEvent(
                node.get("resultId").asText(),
                node.get("patientId").asText(),
                node.get("resultTime").asLong(),
                node.get("resultType").asText()
            );
        }
    }
}