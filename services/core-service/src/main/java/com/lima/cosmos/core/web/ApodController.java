package com.lima.cosmos.core.web;

import com.lima.cosmos.core.domain.ApodDocument;
import com.lima.cosmos.core.service.ApodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/apod")
@RequiredArgsConstructor
public class ApodController {

    private final ApodService service;

    /** 가장 최근 천문 사진 1건. 없으면 204. */
    @GetMapping("/latest")
    public ResponseEntity<ApodDocument> latest() {
        return service.latest()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** 저장된 천문 사진 목록(최근 24, ES). */
    @GetMapping
    public List<ApodDocument> recent() {
        return service.recent();
    }

    /**
     * 해당 날짜의 APOD가 이미 저장돼 있는지 여부.
     * ingestion-service 가 NASA 호출 전에 중복 여부를 확인할 때 사용(하루 API 한도 절약).
     */
    @GetMapping("/exists")
    public Map<String, Object> exists(@RequestParam String date) {
        return Map.of("date", date, "exists", service.exists(date));
    }
}
