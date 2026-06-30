package com.lima.cosmos.core.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** PostgreSQL 정형 저장용 외계행성 엔티티. */
@Entity
@Table(name = "exoplanet")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExoplanetEntity {

    @Id
    private String name;            // pl_name (PK)

    private String hostname;

    @Column(name = "distance_pc")
    private Double distancePc;      // sy_dist

    @Column(name = "orbital_period_days")
    private Double orbitalPeriodDays; // pl_orbper

    @Column(name = "radius_earth")
    private Double radiusEarth;     // pl_rade

    @Column(name = "mass_earth")
    private Double massEarth;       // pl_bmasse

    @Column(name = "stellar_age_gyr")
    private Double stellarAgeGyr;   // st_age

    @Column(name = "stellar_teff_k")
    private Double stellarTeffK;    // st_teff

    @Column(name = "stellar_mass_sun")
    private Double stellarMassSun;  // st_mass

    private Double ra;              // 적경 (degree)

    @Column(name = "declination")
    private Double declination;     // 적위 (degree, NASA 의 dec)

    @Column(name = "disc_year")
    private Integer discYear;

    @Column(name = "discovery_method")
    private String discoveryMethod;
}
