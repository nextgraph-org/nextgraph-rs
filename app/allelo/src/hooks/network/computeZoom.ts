/**
 *  How to use this?
 * 
 * At the center, draw a circle representing the user profile in a square of 40x40 px.
 * with some margin inside, display a circle (maybe radius 15px) that contains or
 * the profile picture of user, or the text: "Me". No label outside of the circle should
 * be displayed.
 * 
 * Contacts are displayed within a box of 54px by 54px. 
 * It must include sme internal margin
 * the profile picture or the initials will be features inside a circle (radius 15px?)
 * amd some text below the circle displays the name of contact.
 * This name should wrap and anything more than 2 lines of text should be hidden
 * 
 * before render, you call once:
 * computeZoom(new ZoomInfo(Math.max(width,height), c10, c8, c6, c4, c2);
 * 
 * width and height are the dimensions of the box where you will display the graph view.
 * Try to have this as big as possible. remove unnecessary nesting of Boxes, padding, margins
 * If the window is resized, you should call computeZoom again and re-render
 * 
 * c10 is the number of contacts you have, that are in the range 1.0-0.8 for network centrality
 * c8 is the same for range 0.8-0.6
 * c6 is the same for range 0.6-0.4
 * c4 is the same for range 0.4-0.2
 * c2 is the same for range 0.2-0.0
 * 
 * computeZoom will return you an array of zoom levels.
 * This array can be of size 1, up to 5, depending of the quantity of data
 * and actual needs for zooming.
 * If there is little data and no need for zooming, you will receive only one entry
 * 
 * We always start the return array by the zoom level 0 (z=0 in our design) which 
 * represents the most zoomed out view (seeing it all from far, with less details),
 * and all the view fitting inside the width or hright constrained you gave.
 * 
 * you will find in the returned object :
 * - level : which tells you at which zoom level this should be displayed
 *   (levels can be of value: 0 , 2, 4, 6, 8 or 10)
 * - viewSize: the size of the "universe" in pixels. the universe is a square.
 * - central10 : the number of contacts to display, from the range 1.0-0.8
 * - central8 : the number of contacts to display, from the range 0.8-0.6
 * - ... and so on
 * - central2 : the number of contacts to display, from the range 0.2-0.0
 * 
 * in each range, you should order the list of contacts by descending MRI, 
 * and take the first "n" ones.
 * 
 * just pass all the selected contacts to D3. We don't draw circles (maybe for debug purpose only).
 * 
 * Switching between zoom levels, when available, (with scroll, pinch, or +/- buttons)
 * will destroy the whole universe, recreate a new one with correct dimensions,
 * and insert the relevant contacts in it. 
 * For now this new universe will be centered on "me", but an improved version could 
 * stay centered on where the previous universe was, with some ratio calculations.
 * 
 * we have to make some tests of the resulting visual output. and might have to adjust
 * the ITEM_SIZE for more spacing or less spacing.
 */

  const ME_ICON_RADIUS = 20;
  const ITEM_SIZE = 54;
  const ITEM_SURFACE = ITEM_SIZE * ITEM_SIZE;
  const ME_SURFACE = ME_ICON_RADIUS * ME_ICON_RADIUS * Math.PI;
  const MIN_VIEW_SIZE = ( ME_ICON_RADIUS + 5 * ITEM_SIZE ) * 2;

  class ZoomInfo {
    count() : number {
      return this.central10 + this.central08 + this.central06 + this.central04 + this.central02;
    }
    radius(): number {
      return this.count() * ITEM_SIZE + ME_ICON_RADIUS;
    }
    surface(): number {
      const r = this.radius();
      return r * r * Math.PI;
    }
    fitsItems(): number {
      return Math.floor( (this.surface()-ME_SURFACE) / ITEM_SURFACE);
    }
    convertToItemCount(): ZoomInfo {
      const resArray: Array<number> = [];
      let surface = ME_SURFACE;
      let circleCount = 0;
      this.getArray().map((circles) => {
        circleCount += circles;
        const r = circleCount*ITEM_SIZE + ME_ICON_RADIUS;
        const s = r * r * Math.PI - surface;
        surface += s;
        const count = Math.floor( s / ITEM_SURFACE );
        resArray.push( count );
      });
      const ret = ZoomInfo.fromArray(this.viewSize, resArray);
      ret.level = this.level;
      return ret;
    }

    computeCircleSize() : ZoomInfo  {
      const resArray: Array<number> = [];
      let surface = ME_SURFACE;
      let circleCount = 0;
      this.getArray().map((itemCount) => {
        surface += ITEM_SURFACE * itemCount;
        const count = Math.ceil((Math.sqrt(surface/Math.PI) - ME_ICON_RADIUS)/ITEM_SIZE);
        resArray.push(count - circleCount);
        circleCount = count;
      });
      return ZoomInfo.fromArray(this.viewSize, resArray);
    }
    viewSize: number;
    // 0, 2, 4, 6, 8, 10
    level?: number | undefined;
    central10: number; 
    central08: number; 
    central06: number; 
    central04: number; 
    central02: number;

    constructor(size: number, 
      central10?: number,
      central08?: number,
      central06?: number, 
      central04?: number, 
      central02?: number) {
        this.viewSize = size;
        this.central10 = central10 ?? 0;
        this.central08 = central08 ?? 0;
        this.central06 = central06 ?? 0;
        this.central04 = central04 ?? 0;
        this.central02 = central02 ?? 0;
    }

    static fromArray(size: number, array: Array<number> ) : ZoomInfo {
      return new ZoomInfo(size, 
          array[0],
          array[1],
          array[2],
          array[3],
          array[4]);
    }
    getArray(): Array<number> {
      return [this.central10,this.central08,this.central06,this.central04,this.central02];
    }
  }

export function computeZoom(init: ZoomInfo) : Array<ZoomInfo> {

    const resZooms = [];

    init.level = 10;
    const level10circles = init.computeCircleSize();
    const level10size = level10circles.radius() * 2;

    // prepare level0

    if (level10size <= init.viewSize) {
      const level0 = ZoomInfo.fromArray(init.viewSize, init.getArray());
      level0.level = 0;
      return [level0];
    }

    const level0 = ZoomInfo.fromArray(init.viewSize, init.getArray().map((count) => {
        return count ? 1 : 0; 
      }));
    level0.level = 0;

    // find out how many circles can fit in viewSize for level 0;
    const remainingSize = init.viewSize - MIN_VIEW_SIZE;

    if (remainingSize >= ITEM_SIZE * 2) {
      let available_circles = Math.floor( remainingSize / (ITEM_SIZE * 2) );

      if (available_circles > 0 && level10circles.central10 > level0.central10) {
          level0.central10 = Math.min(available_circles+1, level10circles.central10);
          available_circles -= level0.central10 - 1;
      }
      if (available_circles > 0 && level10circles.central08 > level0.central08) {
          level0.central08 = Math.min(available_circles+1, level10circles.central08);
          available_circles -= level0.central08 - 1;
      }
      if (available_circles > 0 && level10circles.central06 > level0.central06) {
          level0.central06 = Math.min(available_circles+1, level10circles.central06);
          available_circles -= level0.central06 - 1;
      }
      if (available_circles > 0 && level10circles.central04 > level0.central04) {
          level0.central04 = Math.min(available_circles+1, level10circles.central04);
          available_circles -= level0.central04 - 1;
      }
      if (available_circles > 0 && level10circles.central02 > level0.central02) {
          level0.central02 = Math.min(available_circles+1, level10circles.central02);
          available_circles -= level0.central02 - 1;
      }
    }
    const level0size = level0.radius() * 2;
    const level0_items = level0.convertToItemCount(); 
    resZooms.push(level0_items);

    if (level10size > level0size) {

      // compute other zoom levels
      let level = 2;

      const diff = level10size - level0size;
      const additional_circles = Math.floor(diff / (ITEM_SIZE*2));

      if (additional_circles > 1) {
        const levels = Math.min(5, additional_circles);
        const step = additional_circles / levels;

        const level10_array = level10circles.getArray();
        const level0Count = level0.count();
        const level10Count = level10circles.count();

        for (let i=1; i< levels; i++) {

          const r = i * step + level0Count;
          const level_array = level10_array.map((level10)=>{
            return Math.max(1,Math.floor(r * level10 / level10Count));
          });
          let new_level = ZoomInfo.fromArray(0, level_array);
          new_level.viewSize = new_level.radius() * 2;
          new_level.level = level;
          new_level = new_level.convertToItemCount();
          let already_present = false;
          for (const z of resZooms) {
            if (z.central02 === new_level.central02 
              && z.central04 === new_level.central04
              && z.central06 === new_level.central06
              && z.central08 === new_level.central08
              && z.central10 === new_level.central10
            ) {
              already_present = true;
              break;
            }
          }
          if (already_present) continue;
          resZooms.push(new_level);
          level += 2;
        }

      }

      init.level = level;
      init.viewSize = level10size;
      resZooms.push(init)
    }

    return resZooms;

  }