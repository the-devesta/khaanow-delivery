import { Text, View } from "react-native";

interface BarData {
  label: string;
  value: number;
}

interface EarningBarChartProps {
  data: BarData[];
  maxValue: number;
}

export default function EarningBarChart({
  data,
  maxValue,
}: EarningBarChartProps) {
  const chartHeight = 160;
  const isDense = data.length > 14;
  const showXAxisLabel = (index: number) => {
    if (!isDense) return true;
    return index === 0 || index === data.length - 1 || (index + 1) % 5 === 0;
  };

  return (
    <View className="w-full overflow-hidden">
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: chartHeight,
          paddingHorizontal: isDense ? 6 : 2,
        }}
      >
        {data.map((item, index) => {
          const ratio = maxValue > 0 ? item.value / maxValue : 0;
          const barH = Math.max(
            ratio * (chartHeight - 20),
            item.value > 0 ? 12 : 4,
          );
          const isToday = index === data.length - 1;

          return (
            <View
              key={index}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "flex-end",
                height: chartHeight,
                paddingHorizontal: isDense ? 1 : 2,
              }}
            >
              {/* Value label */}
              {item.value > 0 && !isDense && (
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    color: isToday ? "#F59E0B" : "#9CA3AF",
                    marginBottom: 3,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  ₹
                  {item.value >= 1000
                    ? `${(item.value / 1000).toFixed(1)}k`
                    : item.value}
                </Text>
              )}

              {/* Bar */}
              <View
                style={{
                  width: isDense ? 7 : "75%",
                  maxWidth: 18,
                  height: barH,
                  borderRadius: 12,
                  backgroundColor: isToday
                    ? "#FFD026"
                    : item.value > 0
                      ? "#FFE066"
                      : "#F3F4F6",
                  opacity: item.value > 0 ? 1 : 0.5,
                  ...(item.value > 0
                    ? {
                        borderColor: isToday ? "#D97706" : "#EAB308",
                        borderWidth: 1,
                        borderBottomWidth: 2,
                      }
                    : {}),
                }}
              >
                {item.value > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderTopLeftRadius: 10,
                      borderTopRightRadius: 10,
                      borderTopWidth: 2,
                      borderTopColor: "rgba(255, 255, 255, 0.6)",
                      borderLeftWidth: 1,
                      borderLeftColor: "rgba(255, 255, 255, 0.4)",
                    }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Base line */}
      <View className="h-px bg-gray-100 mt-1 mb-2" />

      {/* Day labels */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: isDense ? 6 : 2,
        }}>
        {data.map((item, index) => {
          const isToday = index === data.length - 1;
          return (
            <View
              key={index}
              style={{
                flex: 1,
                alignItems: "center",
                minHeight: 22,
              }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: isDense ? 9 : 10,
                  fontWeight: isToday ? "800" : "600",
                  color: isToday
                    ? "#F59E0B"
                    : showXAxisLabel(index)
                      ? "#9CA3AF"
                      : "transparent",
                }}>
                {showXAxisLabel(index) ? item.label : "•"}
              </Text>
              {isToday && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#F59E0B",
                    marginTop: 2,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
