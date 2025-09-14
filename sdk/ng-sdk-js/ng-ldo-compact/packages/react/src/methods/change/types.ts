import type {
  ConnectedLdoTransactionDataset,
  ConnectedPlugin,
} from "@ldo/connected";
import type { LdoBase, LdSet } from "@ldo/ldo";

export type useChangeReturn<Type, Plugins extends ConnectedPlugin[]> = [
  Type,
  useChangeSetData<Type, Plugins>,
  useChangeCommitData<Plugins>,
  transactionDataset: ConnectedLdoTransactionDataset<Plugins>,
];

type BaseOtherType = LdoBase | LdSet<LdoBase>;

export type useChangeSetData<Type, Plugins extends ConnectedPlugin[]> = <
  OtherType extends BaseOtherType | undefined = undefined,
>(
  resource: Plugins[number]["types"]["resource"],
  changer: (toChange: OtherType extends undefined ? Type : OtherType) => void,
  input?: OtherType,
) => void;

export type useChangeCommitData<Plugins extends ConnectedPlugin[]> =
  () => ReturnType<ConnectedLdoTransactionDataset<Plugins>["commitToRemote"]>;
