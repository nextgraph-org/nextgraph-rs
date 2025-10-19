import type { Diff, Scope } from "../types.js";
import type { ShapeType, BaseType } from "@ng-org/shex-orm";
import { OrmConnection } from "./ormConnectionHandler.ts";

/**
 *
 * @param shapeType
 * @param scope
 * @returns
 */
export function createSignalObjectForShape<T extends BaseType>(
    shapeType: ShapeType<T>,
    scope?: Scope
) {
    const connection: OrmConnection<T> = OrmConnection.getConnection(
        shapeType,
        scope || ""
    );

    return {
        signalObject: connection.signalObject,
        stop: connection.release,
        readyPromise: connection.readyPromise,
    };
}
