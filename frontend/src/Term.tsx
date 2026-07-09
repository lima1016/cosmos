import { ReactNode, useState } from "react";
import { findTerm } from "./glossary";

/**
 * 인라인 용어 툴팁. 본문 단어를 감싸면 점선 밑줄이 생기고,
 * 마우스를 올리거나(데스크톱) 탭하면(모바일) glossary 정의가 그 자리에 뜬다.
 * 사전에 없는 용어면 그냥 텍스트로 렌더(밑줄 없음).
 *
 *   <Term>Gyr</Term>            // 표시 텍스트로 자동 조회
 *   <Term k="항성온도">항성온도 (K)</Term>  // 조회 키를 따로 지정
 */
export default function Term({ k, children }: { k?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const key = k ?? (typeof children === "string" ? children : "");
  const entry = findTerm(key);
  if (!entry) return <>{children}</>;

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{ borderBottom: "1px dotted currentColor", cursor: "help" }}
      >
        {children}
      </span>
      {open && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            width: 230,
            background: "#0b1124",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 8,
            padding: "9px 11px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.6,
            color: "#e6e9f2",
            textAlign: "left",
            whiteSpace: "normal",
            pointerEvents: "none",
          }}
        >
          <b style={{ display: "block", marginBottom: 3 }}>{entry.term}</b>
          {entry.def}
          {entry.example && (
            <span style={{ display: "block", marginTop: 4, color: "#8a93ab" }}>💡 {entry.example}</span>
          )}
        </span>
      )}
    </span>
  );
}
