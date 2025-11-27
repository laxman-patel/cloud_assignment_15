package com.healthcare.streaming;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.base.DeliveryGuarantee;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.configuration.Configuration;

import java.util.Properties;

/**
 * Simplified Healthcare Analytics Job
 * Just reads from Kafka, processes, and writes back
 */
public class HealthcareAnalyticsJob {

    private static final String BOOTSTRAP_SERVERS = "pkc-n3603.us-central1.gcp.confluent.cloud:9092";
    private static final String API_KEY = "U4W7QRE2EANSFYQC";
    private static final String API_SECRET = "cfltHgGvp1VKM1z2ohDLdjGejcm6hLGPb9kxRkkoggMzuiYAbJdxS8ktdospSpdw";

    public static void main(String[] args) throws Exception {

        // 1. Create configuration for detached execution
        Configuration config = new Configuration();
        config.setString("execution.attached", "false");
        
        // 2. Create environment with config
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment(config);
        
        // Configure for stability on small nodes
        env.setParallelism(1);
        
        // 2. Create Kafka Source
        KafkaSource<String> source = createKafkaSource("appointment-events");

        // 3. Read from Kafka
        DataStream<String> stream = env
            .fromSource(source, WatermarkStrategy.noWatermarks(), "KafkaSource")
            .map(event -> "PROCESSED: " + event);

        // 4. Write to output Kafka topic
        KafkaSink<String> sink = createKafkaSink("analytics-insights");
        stream.sinkTo(sink);

        // 5. Execute (detached mode - won't wait for result)
        env.execute("Healthcare Distributed Analytics Service");
    }

    private static KafkaSource<String> createKafkaSource(String topic) {
        Properties props = new Properties();
        props.setProperty("sasl.mechanism", "PLAIN");
        props.setProperty("security.protocol", "SASL_SSL");
        props.setProperty("sasl.jaas.config", 
            "org.apache.kafka.common.security.plain.PlainLoginModule required username=\"" 
            + API_KEY + "\" password=\"" + API_SECRET + "\";");

        return KafkaSource.<String>builder()
            .setBootstrapServers(BOOTSTRAP_SERVERS)
            .setTopics(topic)
            .setGroupId("flink-healthcare-analytics-group")
            .setStartingOffsets(OffsetsInitializer.latest())
            .setValueOnlyDeserializer(new SimpleStringSchema())
            .setProperties(props)
            .build();
    }

    private static KafkaSink<String> createKafkaSink(String topic) {
        return KafkaSink.<String>builder()
            .setBootstrapServers(BOOTSTRAP_SERVERS)
            .setRecordSerializer(
                KafkaRecordSerializationSchema.builder()
                    .setTopic(topic)
                    .setValueSerializationSchema(new SimpleStringSchema())
                    .build()
            )
            .setDeliveryGuarantee(DeliveryGuarantee.AT_LEAST_ONCE)
            .setProperty("sasl.mechanism", "PLAIN")
            .setProperty("security.protocol", "SASL_SSL")
            .setProperty("sasl.jaas.config", 
                "org.apache.kafka.common.security.plain.PlainLoginModule required username=\"" 
                + API_KEY + "\" password=\"" + API_SECRET + "\";")
            .build();
    }
}