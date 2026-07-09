package com.lima.cosmos.core.web;

import com.lima.cosmos.core.domain.NeoDocument;
import com.lima.cosmos.core.service.NeoService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/neo")
@RequiredArgsConstructor
public class NeoController {

    private final NeoService service;

    /**
     * 저장된 근지구 천체 접근 목록.
     * 기본: 오늘 이후 다가오는 접근만. from/to(YYYY-MM-DD) 지정 시 해당 구간(과거 포함) 조회.
     */
    @GetMapping
    public List<NeoDocument> list(@RequestParam(required = false) String from,
                                  @RequestParam(required = false) String to) {
        return service.list(from, to);
    }

    /** 다가오는 접근(오늘 이후). */
    @GetMapping("/upcoming")
    public List<NeoDocument> upcoming() {
        return service.upcoming();
    }

    /** 잠재적 위험 소행성만. */
    @GetMapping("/hazardous")
    public List<NeoDocument> hazardous() {
        return service.hazardous();
    }

    /**
     * 해당 접근일 데이터가 이미 저장돼 있는지.
     * ingestion-service 가 NASA 호출 전 중복 여부 확인에 사용(하루 한도 절약).
     */
    @GetMapping("/exists")
    public Map<String, Object> exists(@RequestParam String date) {
        return Map.of("date", date, "exists", service.exists(date));
    }
}
