package com.lima.cosmos.core.kafka;

import com.lima.cosmos.core.service.NeoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NeoConsumer {

    private final NeoService service;

    /**
     * raw.neo 리스너. 전역 기본 역직렬화 타입(ExoplanetMessage)을 NeoMessage 로 덮어쓴다.
     */
    @KafkaListener(
            topics = "${cosmos.kafka.topic.raw-neo}",
            groupId = "core-service-neo",
            properties = {"spring.json.value.default.type=com.lima.cosmos.core.kafka.NeoMessage"})
    public void onNeo(NeoMessage message) {
        if (message == null || message.neoId() == null || message.closeApproachDate() == null) {
            return;
        }
        service.save(message);
    }
}
