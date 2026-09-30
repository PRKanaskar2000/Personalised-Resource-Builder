import { dummyConnector } from "./dummy";
import type { Connector } from "../types";

const connectors: Record<string, Connector> = {
  dummy: dummyConnector,
};

export function getConnector(id = "dummy"): Connector {
  return connectors[id] ?? dummyConnector;
}
