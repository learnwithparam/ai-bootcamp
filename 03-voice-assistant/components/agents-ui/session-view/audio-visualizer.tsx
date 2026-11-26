"use client";

import { useVoiceAssistant } from "@livekit/components-react";
import { type MotionProps, motion } from "motion/react";
import { AgentAudioVisualizerAura, type AgentAudioVisualizerAuraProps } from "../agent-audio-visualizer-aura";
import { AgentAudioVisualizerBar, type AgentAudioVisualizerBarProps } from "../agent-audio-visualizer-bar";
import { cn } from "../ui/utils";

const MotionAgentAudioVisualizerAura = motion.create(AgentAudioVisualizerAura);
const MotionAgentAudioVisualizerBar = motion.create(AgentAudioVisualizerBar);

function getBarSize(barCount: number): AgentAudioVisualizerBarProps["size"] {
  if (barCount <= 5) {
    return "xl";
  } else if (barCount <= 10) {
    return "lg";
  } else if (barCount <= 15) {
    return "md";
  } else if (barCount <= 30) {
    return "sm";
  }

  return "icon";
}

function getBarClassName(size: AgentAudioVisualizerBarProps["size"]) {
  if (size === "xl") {
    return "size-[450px] *:min-h-[64px] *:w-[64px] gap-4";
  } else if (size === "lg") {
    return "size-[450px] *:min-h-[48px] *:w-[48px]";
  } else if (size === "md") {
    return "size-[350px] @md/agent-session-block:size-[450px]  *:min-h-[32px] *:w-[32px]";
  } else if (size === "sm") {
    return "size-[300px] @md/agent-session-block:size-[450px] *:min-h-[16px] *:w-[16px]";
  }

  return "size-[300px] @md/agent-session-block:size-[450px] *:min-h-[4px] *:w-[4px]";
}

interface AudioVisualizerProps extends MotionProps {
  isChatOpen: boolean;
  type: "bar" | "aura";
  config?: AgentAudioVisualizerBarProps | AgentAudioVisualizerAuraProps;
  themeMode?: "dark" | "light";
  className?: string;
}

export function AudioVisualizer({
  themeMode,
  type,
  config,
  className,
  // Read by the tile around it, not by the visualizer, so it is kept off the DOM element.
  isChatOpen: _isChatOpen,
  ...props
}: AudioVisualizerProps) {
  const { state, audioTrack } = useVoiceAssistant();

  // `state`/`audioTrack` always reflect the live agent session; any same-named field on
  // `config` is ignored by spreading it before these are set explicitly below.
  switch (type) {
    case "aura": {
      return (
        <MotionAgentAudioVisualizerAura
          {...config}
          state={state}
          themeMode={themeMode}
          audioTrack={audioTrack}
          className={cn("size-[300px] @md/agent-session-block:size-[450px]", className)}
          {...props}
        />
      );
    }
    default: {
      const { size, barCount = 5 } = (config as AgentAudioVisualizerBarProps) ?? {};
      const _size = size ?? getBarSize(barCount);
      const sizedClassName = getBarClassName(_size);

      return (
        <MotionAgentAudioVisualizerBar
          {...config}
          size={_size}
          state={state}
          barCount={barCount}
          audioTrack={audioTrack}
          className={cn(sizedClassName, className)}
          {...props}
        >
          <span className="min-h-2.5 w-2.5 rounded-full bg-current/10 transition-colors duration-250 ease-linear data-[lk-highlighted=true]:bg-current" />
        </MotionAgentAudioVisualizerBar>
      );
    }
  }
}
