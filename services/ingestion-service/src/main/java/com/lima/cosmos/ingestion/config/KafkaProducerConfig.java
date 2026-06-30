package com.lima.cosmos.ingestion.config;

import com.lima.cosmos.ingestion.nasa.ExoplanetRaw;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Kafka 프로듀서를 명시적으로 정의한다.
 * (Spring Boot 자동 구성의 KafkaTemplate 은 제네릭이 와일드카드라
 *  KafkaTemplate&lt;String, ExoplanetRaw&gt; 주입과 매칭되지 않으므로 직접 선언)
 */
@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, ExoplanetRaw> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, ExoplanetRaw> kafkaTemplate(ProducerFactory<String, ExoplanetRaw> pf) {
        return new KafkaTemplate<>(pf);
    }

    // api.nasa.gov 소스(APOD·NeoWs·Mars)용 범용 프로듀서.
    // 페이로드 타입이 제각각이라 값 타입을 Object 로 두고 JSON 직렬화한다.
    @Bean
    public ProducerFactory<String, Object> nasaProducerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, Object> nasaKafkaTemplate(ProducerFactory<String, Object> nasaProducerFactory) {
        return new KafkaTemplate<>(nasaProducerFactory);
    }
}
