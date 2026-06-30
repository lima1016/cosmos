package com.lima.cosmos.ingestion.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic rawExoplanetTopic(@Value("${cosmos.kafka.topic.raw-exoplanet}") String topic) {
        return TopicBuilder.name(topic).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic rawApodTopic(@Value("${cosmos.kafka.topic.raw-apod}") String topic) {
        return TopicBuilder.name(topic).partitions(1).replicas(1).build();
    }
}
