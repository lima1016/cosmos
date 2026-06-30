package com.lima.cosmos.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

// Page<T> 직렬화를 안정적인 구조(PagedModel)로 — "Serializing PageImpl as-is" 경고 제거.
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
@EnableCaching
@SpringBootApplication
public class CoreApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoreApplication.class, args);
    }
}
