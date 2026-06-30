package com.lima.cosmos.core.service;

/**
 * 3D 성도용 항성(시스템) 위치. 행성이 아니라 호스트 항성 단위로 묶는다.
 * ra(적경)·dec(적위)·거리(parsec)로 프론트엔드가 3D 좌표를 계산한다.
 */
public record StarPosition(
        String hostname,
        Double ra,
        Double dec,
        Double distancePc,
        Double stellarTeffK,
        Long planetCount
) {
}
