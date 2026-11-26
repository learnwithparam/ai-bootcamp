"use client";

import { CopilotKitProvider, HttpAgent } from "@copilotkit/react-core/v2";
import { useState } from "react";
import type { ShopState } from "../rules/state";
import { Shop } from "./Shop";

// HttpAgent comes from CopilotKit, not @ag-ui/client: CopilotKit links its own copy, and the two must be one class.
// The page and the agent share one state over AG-UI. The agent is ours, at /api/agent; CopilotKit only
// carries the state, the messages and the basket tool between it and these components.
export function Storefront({
  initial,
  account,
}: {
  initial: ShopState;
  account: { name: string | null; signedIn: boolean };
}) {
  const [agent] = useState(() => new HttpAgent({ url: "/api/agent", initialState: initial }));
  return (
    <CopilotKitProvider selfManagedAgents={{ shop: agent }} enableInspector={false}>
      <Shop account={account} />
    </CopilotKitProvider>
  );
}
