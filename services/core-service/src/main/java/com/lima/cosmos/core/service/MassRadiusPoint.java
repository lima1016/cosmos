package com.lima.cosmos.core.service;

/** 질량–반지름 산점도용 점(둘 다 값이 있는 행성). */
public record MassRadiusPoint(String name, Double radiusEarth, Double massEarth) {
}
