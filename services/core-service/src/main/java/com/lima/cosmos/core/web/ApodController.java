package com.lima.cosmos.core.web;

import com.lima.cosmos.core.domain.ApodDocument;
import com.lima.cosmos.core.service.ApodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    /**
     * 저장된 천문 사진 목록(24개 페이지, 최신순).
     * before(YYYY-MM-DD) 지정 시 더보기 — 그 날짜보다 과거 24개.
     */
    @GetMapping
    public List<ApodDocument> recent(@RequestParam(required = false) String before) {
        return service.page(before);
    }

    /**
     * 해당 날짜의 APOD가 이미 저장돼 있는지 여부.
     * ingestion-service 가 NASA 호출 전에 중복 여부를 확인할 때 사용(하루 API 한도 절약).
     */
    @GetMapping("/exists")
    public Map<String, Object> exists(@RequestParam String date) {
        return Map.of("date", date, "exists", service.exists(date));
    }

    /**
     * 해당 날짜 APOD 를 한국어로 번역해 반환(제목·본문만, 작성자는 원문 유지).
     * 이미 번역돼 있으면 캐시된 값을, 없으면 ai-service 로 번역 후 ES 저장. 문서 없으면 204.
     */
    @PostMapping("/translate")
    public ResponseEntity<ApodDocument> translate(@RequestParam String date) {
        return service.translate(date)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
