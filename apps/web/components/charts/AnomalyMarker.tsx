import React from "react";

export const AnomalyMarker = (props: any) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;

  return (
    <g className="drop-shadow-lg hover:drop-shadow-xl cursor-pointer group">
      <path
        d={`M${cx} ${cy - 28} L${cx + 24} ${cy + 18} L${cx - 24} ${cy + 18} Z`}
        fill="#ef4444"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:scale-110 origin-center"
      />
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="white"
        fontSize="22"
        fontWeight="900"
        className="pointer-events-none"
      >
        !
      </text>
    </g>
  );
};

export const SmallAnomalyMarker = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload?.isAnomaly || !cx || !cy) return null;

  return (
    <g className="drop-shadow-sm hover:drop-shadow-md cursor-pointer group">
      <path
        d={`M${cx} ${cy - 7} L${cx + 6} ${cy + 5} L${cx - 6} ${cy + 5} Z`}
        fill="#ef4444"
        stroke="#fff"
        strokeWidth="2"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:scale-110 origin-center"
      />
      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        fill="white"
        fontSize="8"
        fontWeight="800"
        className="pointer-events-none"
      >
        !
      </text>
    </g>
  );
};
