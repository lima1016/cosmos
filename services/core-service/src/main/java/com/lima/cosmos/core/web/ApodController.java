package com.lima.cosmos.core.web;

import com.lima.cosmos.core.domain.ApodDocument;
import com.lima.cosmos.core.service.ApodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
