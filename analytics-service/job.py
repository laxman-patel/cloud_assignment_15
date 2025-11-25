from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment, EnvironmentSettings

def main():
    env = StreamExecutionEnvironment.get_execution_environment()
    settings = EnvironmentSettings.new_instance().in_streaming_mode().build()
    t_env = StreamTableEnvironment.create(env, environment_settings=settings)

    # Define Kafka Source
    t_env.execute_sql("""
        CREATE TABLE appointments (
            event STRING,
            appointmentId STRING,
            patientId STRING,
            `time` TIMESTAMP(3),
            WATERMARK FOR `time` AS `time` - INTERVAL '5' SECOND
        ) WITH (
            'connector' = 'kafka',
            'topic' = 'appointment-events',
            'properties.bootstrap.servers' = 'kafka:9092',
            'format' = 'json'
        )
    """)

    # Define Kafka Sink
    t_env.execute_sql("""
        CREATE TABLE analytics_results (
            window_end TIMESTAMP(3),
            appointment_count BIGINT
        ) WITH (
            'connector' = 'kafka',
            'topic' = 'analytics-results',
            'properties.bootstrap.servers' = 'kafka:9092',
            'format' = 'json'
        )
    """)

    # Perform Aggregation (Count per minute)
    t_env.execute_sql("""
        INSERT INTO analytics_results
        SELECT
            TUMBLE_END(`time`, INTERVAL '1' MINUTE) as window_end,
            COUNT(appointmentId) as appointment_count
        FROM appointments
        GROUP BY
            TUMBLE(`time`, INTERVAL '1' MINUTE)
    """)

    print("Flink job started")

if __name__ == '__main__':
    main()
