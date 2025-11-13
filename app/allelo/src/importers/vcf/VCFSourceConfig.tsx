import { ImportSourceConfig } from "@/types/importSource";
import { UilFileAlt } from "@iconscout/react-unicons";
import { VCFRunner } from "./VCFRunner";

export const VCFSourceConfig: ImportSourceConfig = {
  name: 'VCF File',
  type: 'vcf',
  icon: <UilFileAlt size="20" />,
  description: 'Import contacts from a VCF or vCard file',
  isAvailable: true,
  customButtonName: 'Upload VCF File',
  Runner: VCFRunner
};
