package com.lima.cosmos.core.kafka;

import com.lima.cosmos.core.service.ExoplanetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExoplanetConsumer {

    private final ExoplanetService service;

    @KafkaListener(
            topics = "${cosmos.kafka.topic.raw-exoplanet}",
            groupId = "core-service")
    public void onMessage(ExoplanetMessage message) {
        if (message == null || message.pl_name() == null) {
            return;
        }
        log.debug("수신: {}", message.pl_name());
        service.ingest(message);
    }
}
