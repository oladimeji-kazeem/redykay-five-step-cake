import hero from "@/assets/hero.jpg";
import sculpted from "@/assets/cake-sculpted.jpg";
import vegan from "@/assets/cake-vegan.jpg";
import corporate from "@/assets/cake-corporate.jpg";
import buttercream from "@/assets/cake-buttercream.jpg";
import tasting from "@/assets/tasting-box.jpg";

export const CONTACT = {
  email: "hello@redykay.co.uk",
  whatsapp: "447000000000",
  serviceArea: "London & the Home Counties (collection or delivery within 30 miles)",
  replyPromise: "within 24 hours, Monday to Saturday",
};

export const images = { hero, sculpted, vegan, corporate, buttercream, tasting };

export type Occasion = "Wedding" | "Birthday" | "Corporate" | "Celebration";
export type Style = "Sculpted" | "Buttercream" | "Fondant" | "Dietary-Friendly";

export const gallery: {
  src: string; title: string; occasion: Occasion; style: Style; brief: string; solution: string;
}[] = [
  { src: hero, title: "Pressed-flower three tier", occasion: "Wedding", style: "Buttercream",
    brief: "A garden wedding wanting something soft, natural and not too sweet.",
    solution: "Lemon & elderflower sponge, smooth Swiss meringue buttercream and hand-pressed edible flowers." },
  { src: sculpted, title: "The well-travelled suitcase", occasion: "Birthday", style: "Sculpted",
    brief: "A 60th for a lifelong traveller — every sticker a place she'd been.",
    solution: "Carved vanilla & salted caramel, wrapped in hand-painted fondant with edible stickers." },
  { src: vegan, title: "Raspberry dark chocolate", occasion: "Celebration", style: "Dietary-Friendly",
    brief: "A family party where half the guests were vegan and two were coeliac.",
    solution: "One cake for everyone: vegan, gluten-free chocolate layers with raspberry and glossy ganache." },
  { src: corporate, title: "Emerald & gold leaf", occasion: "Corporate", style: "Fondant",
    brief: "A brand launch needing a sharp, on-colour centrepiece delivered on time.",
    solution: "Sharp-edged fondant in their brand green, kintsugi-style gold lines, delivered and set up." },
  { src: buttercream, title: "Peach rosette tiers", occasion: "Birthday", style: "Buttercream",
    brief: "A 30th wanting playful, pretty and photo-ready.",
    solution: "Two tiers of strawberry & vanilla, piped rosettes and a scatter of pearl sprinkles." },
  { src: tasting, title: "Wedding tasting box", occasion: "Wedding", style: "Dietary-Friendly",
    brief: "A couple who couldn't agree on a flavour — and one was dairy-free.",
    solution: "Six-flavour box with dairy-free versions marked, so they could decide at home together." },
];
