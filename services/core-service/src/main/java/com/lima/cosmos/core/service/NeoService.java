package com.lima.cosmos.core.service;

import com.lima.cosmos.core.domain.NeoDocument;
import com.lima.cosmos.core.kafka.NeoMessage;
import com.lima.cosmos.core.repository.NeoSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/** NeoWs 저장/조회 — Elasticsearch(neo 인덱스). */
@Service
@RequiredArgsConstructor
public class NeoService {

    private final NeoSearchRepository repository;

    public void save(NeoMessage msg) {
        repository.save(NeoDocument.builder()
                .id(msg.neoId() + "_" + msg.closeApproachDate())
                .neoId(msg.neoId())
                .name(msg.name())
                .hazardous(msg.hazardous())
                .absoluteMagnitudeH(msg.absoluteMagnitudeH())
                .diameterMinKm(msg.diameterMinKm())
                .diameterMaxKm(msg.diameterMaxKm())
                .closeApproachDate(msg.closeApproachDate())
                .relativeVelocityKmS(msg.relativeVelocityKmS())
                .missDistanceKm(msg.missDistanceKm())
                .missDistanceLunar(msg.missDistanceLunar())
                .missDistanceAstronomical(msg.missDistanceAstronomical())
                .build());
    }

    public List<NeoDocument> recent() {
        return repository.findTop100ByOrderByCloseApproachDateAsc();
    }

    public List<NeoDocument> hazardous() {
        return repository.findTop100ByHazardousTrueOrderByCloseApproachDateAsc();
    }

    public List<NeoDocument> upcoming() {
        return repository.findTop100ByCloseApproachDateGreaterThanEqualOrderByCloseApproachDateAsc(
                LocalDate.now().toString());
    }

    public boolean exists(String date) {
        if (date == null || date.isBlank()) return false;
        return repository.existsByCloseApproachDate(date);
    }
}
