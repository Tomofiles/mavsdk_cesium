package main

type Telemetry struct {
	Position    *Position    `json:"position,omitempty"`
	Orientation *Orientation `json:"orientation,omitempty"`
}

type Position struct {
	CartographicDegrees []float64 `json:"cartographicDegrees"`
}

type Orientation struct {
	UnitQuaternion []float64 `json:"unitQuaternion"`
}
