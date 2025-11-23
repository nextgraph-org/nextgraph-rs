import {RCard} from "@/.ldo/rcard.typings.ts";
import {useDroppable} from "@dnd-kit/core";
import {RCardsMobileWidgetTile} from "@/components/rcards/RCardsCategoryTile/RCardsMobileWidgetTile.tsx";
import {RCardsSideWidgetTile} from "@/components/rcards/RCardsCategoryTile/RCardsSideWidgetTile.tsx";

interface RCardsCategoryTileProps {
  rCard: RCard;
  isMobile?: boolean;
  isActive?: boolean;
  onActivate?: () => void;
}

export const RCardsCategoryTile = ({
                                     rCard,
                                     isMobile = false,
                                     isActive = false,
                                     onActivate
                                   }: RCardsCategoryTileProps) => {
  const {setNodeRef, isOver, active} = useDroppable({
    id: rCard["@id"]!,
    data: {
      type: 'rcard',
      rcardId: rCard["@id"]
    }
  });
  const isDragOver = Boolean(isOver && active?.data?.current?.type === 'contact');

  return isMobile
    ? <RCardsMobileWidgetTile
      rCard={rCard}
      isActive={isActive}
      onActivate={onActivate!}
      isDragOver={isDragOver}
      setNodeRef={setNodeRef}
    />
    : <RCardsSideWidgetTile rCard={rCard} isDragOver={isDragOver} setNodeRef={setNodeRef}/>
};
