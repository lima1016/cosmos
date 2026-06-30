package com.lima.cosmos.core.kafka;

import com.lima.cosmos.core.service.ApodService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApodConsumer {

    private final ApodService service;

    /**
     * raw.exoplanet 와 메시지 타입이 다르므로, 이 리스너에 한해
     * JsonDeserializer 의 기본 역직렬화 타입을 ApodMessage 로 덮어쓴다.
     */
    @KafkaListener(
            topics = "${cosmos.kafka.topic.raw-apod}",
            groupId = "core-service-apod",
            properties = {"spring.json.value.default.type=com.lima.cosmos.core.kafka.ApodMessage"})
    public void onApod(ApodMessage message) {
        if (message == null || message.date() == null) {
            return;
        }
        log.debug("APOD 수신: {} ({})", message.title(), message.date());
        service.save(message);
    }
}
