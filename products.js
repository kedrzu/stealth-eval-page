'use strict';

/*
 * Made-up catalogue. Every brand and product here is invented. Rows are compact; descriptions, specs, reviews, FAQ and
 * gallery images are built from them by the helpers below, so each product has its own long text.
 */

const CATEGORIES = {
  grinders: 'Coffee grinders',
  kettles: 'Kettles',
  scales: 'Scales',
  filters: 'Filters',
  accessories: 'Accessories',
};

const SPEC_KEYS = {
  grinders: ['Burr type', 'Burr size', 'Bean capacity', 'Grind settings'],
  kettles: ['Capacity', 'Power', 'Temperature control', 'Body material'],
  scales: ['Capacity', 'Resolution', 'Battery', 'Timer'],
  filters: ['Material', 'Size', 'Pack', 'Fits'],
  accessories: ['Material', 'Size', 'Dimensions', 'Weight'],
};

// id, name, brand, category, price, rating, inStock, short text, feature 1, feature 2, four spec values
const ROWS = [
  ['g01', 'Compact Hand Grinder 30', 'Grindalo', 'grinders', 49, 4.4, true, 'A pocket-sized hand mill for camping trips and the office desk.', 'a 30 mm steel burr set', 'a folding crank handle', ['Conical steel', '30 mm', '20 g', '24 clicks']],
  ['g02', 'Hand Grinder Pro 48', 'Grindalo', 'grinders', 119, 4.8, true, 'A heavier hand mill with a 48 mm burr and a very smooth bearing.', 'a 48 mm conical burr', 'a double-bearing shaft', ['Conical steel', '48 mm', '35 g', '60 clicks']],
  ['g03', 'Home Burr Grinder', 'Oakline', 'grinders', 139, 4.3, true, 'An electric burr grinder for the everyday filter pot.', 'a 40 mm ceramic burr', 'a 250 g hopper with a lid', ['Conical ceramic', '40 mm', '250 g', '30 steps']],
  ['g04', 'Flat Burr Grinder 64', 'Fenwick Labs', 'grinders', 389, 4.7, true, 'A flat-burr electric grinder with a low-retention chute.', 'a 64 mm flat burr set', 'a low-retention chute', ['Flat steel', '64 mm', '300 g', 'Stepless']],
  ['g05', 'Single Dose Grinder Mini', 'Fenwick Labs', 'grinders', 229, 4.6, true, 'Grind exactly what you brew, with almost nothing left behind.', 'a bellows for blowing out grounds', 'a magnetic catch cup', ['Flat steel', '47 mm', '30 g', '40 steps']],
  ['g06', 'On-Demand Espresso Grinder', 'Tamperly', 'grinders', 549, 4.5, false, 'A timed espresso grinder that doses straight into the portafilter.', 'a digital dose timer', 'a portafilter fork', ['Flat steel', '58 mm', '400 g', 'Stepless']],
  ['g07', 'Slim Travel Grinder', 'Harbor Roast', 'grinders', 39, 4.1, true, 'Fits in a backpack side pocket and grinds a mug in a minute.', 'a slim aluminium body', 'a removable crank', ['Conical steel', '33 mm', '18 g', '18 clicks']],
  ['g08', 'Classic Blade Grinder', 'Oakline', 'grinders', 19, 3.6, true, 'A simple blade grinder for spices and the occasional coffee.', 'a stainless steel blade', 'a one-touch lid switch', ['Blade', 'n/a', '60 g', 'Timed']],
  ['g09', 'Walnut Edition Hand Grinder', 'Mellor & Finch', 'grinders', 159, 4.9, true, 'A hand mill with an oiled walnut body and a brass handle.', 'an oiled walnut body', 'a solid brass handle', ['Conical steel', '42 mm', '30 g', '48 clicks']],
  ['g10', 'Quiet Electric Grinder', 'Lumen Brew', 'grinders', 199, 4.4, true, 'A damped electric grinder that will not wake the household.', 'a sound-damped housing', 'a 45 mm steel burr', ['Conical steel', '45 mm', '280 g', '40 steps']],
  ['k01', 'Gooseneck Kettle 0.9 L', 'Pourwell', 'kettles', 79, 4.5, true, 'A slim gooseneck for slow and controlled pour-overs.', 'a counterweighted handle', 'a narrow gooseneck spout', ['0.9 L', '1000 W', 'None', 'Stainless steel']],
  ['k02', 'Precision Gooseneck Kettle', 'Pourwell', 'kettles', 129, 4.8, true, 'A gooseneck with one-degree temperature steps and a hold mode.', 'one-degree temperature steps', 'a 60 minute hold mode', ['0.8 L', '1200 W', '1 degree steps', 'Stainless steel']],
  ['k03', 'Stovetop Kettle 1.2 L', 'Kettlewick', 'kettles', 45, 4.2, true, 'A plain steel kettle with a whistle and a cool-touch handle.', 'a removable whistle', 'a cool-touch handle', ['1.2 L', 'Stovetop', 'None', 'Stainless steel']],
  ['k04', 'Electric Kettle 1.7 L', 'Kettlewick', 'kettles', 59, 4.3, true, 'A family-size electric kettle with a wide lid and a water window.', 'a wide opening lid', 'a hidden heating plate', ['1.7 L', '2200 W', 'None', 'Steel and BPA-free plastic']],
  ['k05', 'Variable Temperature Kettle', 'Lumen Brew', 'kettles', 99, 4.4, true, 'Five presets for green tea, white tea, coffee and more.', 'five temperature presets', 'a backlit control ring', ['1.0 L', '1800 W', '5 presets', 'Stainless steel']],
  ['k06', 'Foldable Travel Kettle', 'Harbor Roast', 'kettles', 35, 3.9, true, 'A silicone kettle that folds flat for the suitcase.', 'a collapsible silicone body', 'dual-voltage mains', ['0.5 L', '600 W', 'None', 'Food-grade silicone']],
  ['k07', 'Cast Enamel Kettle', 'Mellor & Finch', 'kettles', 89, 4.6, false, 'A heavy enamel kettle that looks good left on the hob.', 'a hand-finished enamel coat', 'a beechwood handle', ['1.1 L', 'Stovetop', 'None', 'Enamelled steel']],
  ['k08', 'Smart Kettle with Hold Mode', 'Fenwick Labs', 'kettles', 149, 4.2, true, 'A kettle with a timer, a hold mode and a tiny display.', 'a small status display', 'a programmable timer', ['1.0 L', '1500 W', '1 degree steps', 'Stainless steel']],
  ['s01', 'Basic Brew Scale', 'Tamperly', 'scales', 29, 4.0, true, 'A no-frills scale with a timer for filter coffee.', 'a built-in timer', 'a non-slip silicone mat', ['2 kg', '0.1 g', 'AAA x 2', 'Yes']],
  ['s02', 'Precision Brew Scale', 'Tamperly', 'scales', 89, 4.7, true, 'A fast, water-resistant scale with 0.1 g steps.', 'a water-resistant pad', 'a flow-rate readout', ['3 kg', '0.1 g', 'USB-C', 'Yes']],
  ['s03', 'Pocket Scale 500', 'Harbor Roast', 'scales', 19, 3.8, true, 'A credit-card sized scale for beans and tea.', 'a flip-open cover', 'a tare button you can find without looking', ['500 g', '0.1 g', 'CR2032 x 2', 'No']],
  ['s04', 'Espresso Scale Slim', 'Fenwick Labs', 'scales', 119, 4.6, true, 'A thin scale that fits under the portafilter.', 'a 12 mm tall body', 'an auto-start timer', ['2 kg', '0.1 g', 'USB-C', 'Auto']],
  ['s05', 'Kitchen Scale Steel', 'Kettlewick', 'scales', 39, 4.3, true, 'A general kitchen scale with a big steel platform.', 'a brushed steel platform', 'a tilting display', ['5 kg', '1 g', 'AAA x 2', 'No']],
  ['s06', 'Smart Brew Scale', 'Lumen Brew', 'scales', 99, 4.1, true, 'A scale with preset recipes and a small screen.', 'twelve recipe presets', 'a bright segment display', ['3 kg', '0.1 g', 'USB-C', 'Yes']],
  ['s07', 'Glass Top Scale', 'Oakline', 'scales', 49, 4.2, false, 'A tempered glass platform on a matte base.', 'a tempered glass top', 'a backlit display', ['3 kg', '0.1 g', 'AAA x 2', 'Yes']],
  ['s08', 'Bamboo Drip Scale', 'Mellor & Finch', 'scales', 69, 4.5, true, 'A scale with a bamboo surface and a drip tray.', 'a bamboo surface', 'a removable drip tray', ['2 kg', '0.1 g', 'USB-C', 'Yes']],
  ['f01', 'V60 Paper Filters 02', 'Pourwell', 'filters', 6, 4.6, true, 'One hundred white paper cones for size 02 drippers.', 'oxygen-bleached paper', 'a fine rinse-friendly weave', ['Paper', 'Size 02', '100 pcs', 'Cone drippers, size 02']],
  ['f02', 'Cone Paper Filters No. 4', 'Brewhaus Nord', 'filters', 5, 4.3, true, 'Classic number four cones for the family coffee maker.', 'natural brown paper', 'a crimped, sturdy seam', ['Paper', 'No. 4', '200 pcs', 'No. 4 coffee makers']],
  ['f03', 'Metal Mesh Filter', 'Oakline', 'filters', 22, 4.2, true, 'A reusable steel filter for a fuller body in the cup.', 'a fine laser-cut mesh', 'a dishwasher-safe frame', ['Stainless steel', 'Size 02', '1 pc', 'Cone drippers, size 02']],
  ['f04', 'Cloth Filter Set', 'Mellor & Finch', 'filters', 18, 4.0, true, 'Two washable cotton filters with a soft sweet cup.', 'unbleached organic cotton', 'a stitched steel ring', ['Cotton', 'No. 4', '2 pcs', 'No. 4 holders']],
  ['f05', 'Press Paper Filters', 'Brewhaus Nord', 'filters', 7, 4.4, true, 'Three hundred round filters for compact press brewers.', 'micro-perforated paper', 'a snug round edge', ['Paper', '64 mm', '300 pcs', 'Compact press brewers']],
  ['f06', 'Flat-bottom Paper Filters', 'Pourwell', 'filters', 6, 4.1, false, 'Flat-bottom baskets for even extraction.', 'a pleated basket shape', 'a sturdy rim', ['Paper', 'Size 155', '100 pcs', 'Flat-bottom drippers']],
  ['f07', 'Water Filter Cartridges', 'Kettlewick', 'filters', 24, 4.5, true, 'Three cartridges that take the scale out of kettle water.', 'a carbon and resin core', 'a two-month service life', ['Carbon and resin', 'Standard', '3 pcs', 'Kettlewick jugs']],
  ['a01', 'Steel Tamper 58 mm', 'Tamperly', 'accessories', 34, 4.5, true, 'A weighted tamper with a flat steel base.', 'a flat steel base', 'a knurled handle', ['Stainless steel', '58 mm', '58 x 60 mm', '420 g']],
  ['a02', 'Milk Pitcher 350 ml', 'Tamperly', 'accessories', 24, 4.3, true, 'A pitcher with a sharp spout for latte art.', 'a pointed spout', 'etched volume marks', ['Stainless steel', '350 ml', '95 x 85 mm', '180 g']],
  ['a03', 'Knock Box', 'Harbor Roast', 'accessories', 29, 3.9, true, 'A small box with a rubber bar for spent pucks.', 'a rubber knock bar', 'a non-slip base', ['ABS and rubber', '1 L', '160 x 120 mm', '350 g']],
  ['a04', 'Vacuum Bean Canister', 'Oakline', 'accessories', 32, 4.4, true, 'Keeps beans fresh with a one-way pump valve.', 'a pump-down valve', 'a tinted glass body', ['Glass and steel', '500 g', '110 x 180 mm', '620 g']],
  ['a05', 'Descaling Powder', 'Kettlewick', 'accessories', 9, 4.2, true, 'Food-safe citric powder for kettles and machines.', 'a citric acid formula', 'a resealable pouch', ['Citric acid', '500 g', '150 x 100 mm', '500 g']],
  ['a06', 'Cleaning Brush Set', 'Brewhaus Nord', 'accessories', 12, 4.0, true, 'Three brushes for burrs, chutes and portafilters.', 'a soft boar-hair brush', 'a stiff nylon brush', ['Wood and nylon', '3 pcs', '180 x 25 mm', '90 g']],
  ['a07', 'Walnut Dripper Stand', 'Mellor & Finch', 'accessories', 54, 4.7, false, 'A walnut stand that holds a dripper above your mug.', 'solid walnut', 'a felt-lined base', ['Walnut', 'Mug or server', '140 x 140 x 200 mm', '480 g']],
];

const TEXT = {
  grinders: [
    [
      'The {name} from {brand} is built around one simple idea: a good cup starts with an even grind. It comes with {f1} and {f2}, which together give it a character you notice from the very first morning.',
      '{brand} designed the {name} for people who weigh their beans and taste the difference between Tuesday and Wednesday. With {f1} and {f2}, it keeps the routine short and the results steady.',
    ],
    [
      'Grind consistency is where a mill earns its price. The burrs cut beans instead of crushing them, which leaves fewer fine particles clogging the filter and fewer boulders that under-extract. In practice that means a sweeter cup with less bitterness, whether you brew a pour-over, an immersion batch or something under pressure.',
      'Inside, the burr geometry is tuned for clarity. Beans are pulled through at a steady pace, cut to a narrow range of sizes and dropped into the catch cup with little static. The result is less mess on the counter and a grind you can repeat tomorrow at the same setting.',
    ],
    [
      'Adjusting the grind is straightforward. The dial is marked clearly, and its steps are small enough to dial in a new bag in two or three tries. Note the number next to your favourite recipe and you can come back to it a month later and land on the same spot.',
    ],
    [
      'Looking after the {name} takes a minute. Run a few beans through it to clear out old grounds, brush the burr chamber from time to time and wipe the outside with a dry cloth. Avoid washing the burrs with water; a dry brush does a better job.',
      'Cleaning is meant to be easy. Every few weeks, remove the catch cup, tap out the grounds and brush the chamber. The burrs need no lubricant, and a little coffee oil is part of their seasoning.',
    ],
    [
      '{brand} backs the {name} with a two-year warranty and a spare-parts service, so a worn part is a small repair rather than a reason to buy a new grinder. It ships in recycled card with a quick-start guide, a cleaning brush and a short note on where to begin with your first grind.',
    ],
  ],
  kettles: [
    [
      'The {name} from {brand} is a kettle for people who care about what happens after the water boils. It brings {f1} and {f2}, two details that make the daily cup a little calmer.',
      '{brand} made the {name} to be used every day, not only on weekends. It has {f1} and {f2}, and little else that you would have to learn.',
    ],
    [
      'Pouring is a skill, and the right kettle makes it easier. The spout is shaped to give a steady stream that does not splash or dribble down the side, and the handle sits so that your wrist stays straight when the kettle is full. Whether you pour slowly over a dripper or fill a teapot, the water goes where you aim it.',
      'Heat-up is quick and quiet. The element is sealed under the base, so there is nothing inside to collect limescale in awkward corners, and the water reaches the boil in a few minutes without a loud roar.',
    ],
    [
      'Safety was part of the design from the start. The lid locks, the handle stays cool, and the kettle switches itself off when the water boils or when it is lifted off the base without water. Mains models ship with a short cable that you can tuck away behind the counter.',
    ],
    [
      'To keep the {name} looking new, descale it every month or two with citric acid and wipe the outside with a soft cloth. Do not put it in the dishwasher; a quick rinse with warm water is all it needs between uses.',
      'Looking after it is simple: empty it when you are not using it, rinse it from time to time and descale it as the water in your area asks. A clean kettle makes better tea, and it lasts for years.',
    ],
    [
      '{brand} covers the {name} with a two-year warranty. It ships in a recycled box with a care card, and the manual is short and written in plain language.',
    ],
  ],
  scales: [
    [
      'The {name} from {brand} is a scale for people who like to know exactly how much goes into the cup. It brings {f1} and {f2}, and nothing that gets in the way of a quick measurement.',
      '{brand} designed the {name} to sit by the kettle and be used without thinking. With {f1} and {f2}, it turns a vague scoop into a recipe you can repeat.',
    ],
    [
      'Accuracy matters most in the first few grams. The sensor reacts quickly to a change in weight, so the numbers settle while you are still pouring, and the readout is large enough to read at arm length. Used with a timer, it tells you how fast the water is going in, which is the missing piece in a lot of brews.',
      'The platform is flat and wide enough for a server or a mug, and the surface stays put when you press the buttons. The display refreshes often enough that you can pour to a target weight without overshooting it.',
    ],
    [
      'Everyday handling was part of the design. The buttons have a clear click, the tare resets in a moment, and the scale switches itself off when it is idle. Keep it dry and wipe it down with a damp cloth after use.',
    ],
    [
      'To care for the {name}, keep it away from heat and standing water, wipe it with a soft cloth and store it flat. If the readings drift, switch it off and on again on a level surface and tare it without a load.',
      'A scale is a small instrument and worth treating like one. Do not leave heavy things on it when it is off, and keep it level on the counter. Check it from time to time against a known weight, such as a new coin.',
    ],
    [
      '{brand} gives the {name} a one-year warranty and ships it with a short guide that lists a few starting recipes. Batteries, where needed, are included.',
    ],
  ],
  filters: [
    [
      'The {name} from {brand} is a simple supply that has a real effect on the cup. It offers {f1} and {f2}, and it is made to fit the equipment named in the specifications without any trimming or folding.',
      '{brand} makes the {name} for people who brew often and run out of filters at the worst time. It has {f1} and {f2}, and it comes in a pack that lasts.',
    ],
    [
      'The filter sits between your coffee and your cup, and it decides what gets through. A tight, even weave holds back fine particles and oils, which gives a cleaner flavour, while a more open one lets more body through. The one here is tuned to give a balanced cup without slowing the brew to a crawl.',
      'Because the material is consistent from one filter to the next, the brew time stays the same from cup to cup. That makes it easier to dial in your grind, since you are changing one thing at a time.',
    ],
    [
      'Rinse the filter with hot water before use. This removes any trace of paper or dust from the material and warms the brewer at the same time. It takes a few seconds and makes a noticeable difference in a light roast.',
    ],
    [
      'Store the {name} in a dry place away from strong smells, as filters pick up odours easily. Keep the pack closed between uses. Used filters can go in the compost with the grounds.',
      'Keep the filters flat and dry. If you have a reusable type, rinse it after each brew and let it dry in the open air; a regular deep clean will keep it fresh for a long time.',
    ],
    [
      '{brand} packs the {name} in recycled card, with no plastic wrapper. If it does not fit your equipment, you can return the unopened pack within thirty days.',
    ],
  ],
  accessories: [
    [
      'The {name} from {brand} is one of those small tools that you only notice when it is missing. It is made with {f1} and {f2}, and it is built to survive a busy kitchen.',
      '{brand} designed the {name} for a home counter that sees a lot of daily use. It has {f1} and {f2}, and it is meant to be picked up without having to think about it.',
    ],
    [
      'Good accessories save time and take the mess out of the routine. This one is made to a size that matches common equipment, so you do not have to hunt for an adapter, and the materials are chosen to be safe around food and drink.',
      'Everything about it is practical: the proportions, the weight in the hand and the finish that does not show every fingerprint. It is a tool that feels the same on the hundredth use as on the first.',
    ],
    [
      'It works with the rest of your gear and does not demand a whole new set-up. If you already have a grinder, a kettle and a scale from the same range, it fits on the same shelf and in the same drawer.',
    ],
    [
      'Wash the {name} by hand with warm soapy water and dry it with a soft cloth. Avoid harsh abrasives, which can leave marks, and do not leave it in water for long periods.',
      'To keep it looking good, rinse it after each use and dry it fully before it goes back in the drawer. A little care will keep it in shape for years.',
    ],
    [
      '{brand} gives the {name} a one-year warranty against faults in the material or workmanship. It arrives in a recycled box with a short care card.',
    ],
  ],
};

const FAQ = {
  common: [
    ['How long does delivery take?', 'Orders placed before 14:00 on a working day usually ship the same day and arrive within two to four working days. We send a tracking link as soon as the parcel is on its way.'],
    ['What does the warranty cover?', 'The warranty covers faults in materials and workmanship. It does not cover wear from normal use, damage from drops, or limescale build-up. Keep your order confirmation as proof of purchase.'],
    ['Can I return it if I change my mind?', 'Yes. You can return unused items in their original packaging within thirty days for a refund of the purchase price. Return postage is on you unless the item arrived damaged.'],
  ],
  grinders: ['How do I find the right grind setting?', 'Start in the middle of the range and change one step at a time. If the brew tastes sour or thin, grind finer; if it tastes bitter or dry, grind coarser. Write down the setting that works for each bag.'],
  kettles: ['How often should I descale it?', 'In soft water areas every two to three months is enough; in hard water areas, once a month. A spoonful of citric powder in warm water, left for twenty minutes, does the job.'],
  scales: ['Is the scale water-resistant?', 'Light splashes are fine, but do not put it under a running tap or submerge it. Wipe it dry after use and let any moisture evaporate before you store it.'],
  filters: ['Do I have to rinse the filter?', 'We suggest it. A quick rinse with hot water removes any papery taste and warms the brewer, so the temperature stays steady during the brew.'],
  accessories: ['Is it safe for the dishwasher?', 'We recommend washing by hand with warm soapy water. Dishwasher detergents are harsh and can dull the finish over time.'],
};

const REVIEWS = [
  ['Marta K.', 5, 'Exactly what I hoped for', 'It arrived well packed, worked straight out of the box and has been part of my morning routine for three months. I would buy it again without thinking about it.'],
  ['Daniel R.', 4, 'Good, with one small gripe', 'The quality is clearly better than what I had before. My only complaint is that the manual is thin, but a quick search answered everything I wanted to know.'],
  ['Ola W.', 5, 'Worth the money', 'I compared a few alternatives and this one felt the most solid. After a couple of weeks I can say it has made my coffee more consistent.'],
  ['Pete S.', 3, 'Fine, nothing special', 'It does the job and looks decent on the counter. I expected a little more for the price, but I have no real complaints.'],
  ['Hana L.', 4, 'Nice details', 'Small things like the finish and the way it feels in the hand show that someone thought about it. Delivery was fast too.'],
  ['Tomasz B.', 5, 'A pleasant surprise', 'I bought it as a gift and ended up buying a second one for myself. It is easy to use and easy to keep clean.'],
];

function fillTemplate(text, values) {
  return text.replace(/\{(\w+)\}/g, (_, key) => values[key]);
}

function buildDescription(row, index) {
  const [, name, brand, category, , , , , f1, f2] = row;
  const values = { name, brand, f1, f2 };
  return TEXT[category].map((variants) => fillTemplate(variants[index % variants.length], values));
}

function buildReviews(index) {
  const count = 3 + (index % 2);
  return Array.from({ length: count }, (_, i) => REVIEWS[(index + i) % REVIEWS.length]).map(
    ([author, rating, title, text]) => ({ author, rating, title, text }),
  );
}

function buildProduct(row, index) {
  const [id, name, brand, category, price, rating, inStock, short, , , specValues] = row;
  const specs = SPEC_KEYS[category].map((key, i) => [key, specValues[i]]);
  specs.push(['Warranty', category === 'grinders' || category === 'kettles' ? '2 years' : '1 year']);
  return {
    id,
    name,
    brand,
    category,
    price,
    rating,
    inStock,
    short,
    description: buildDescription(row, index),
    specs,
    reviews: buildReviews(index),
    faq: [...FAQ.common.slice(0, 2), FAQ[category], FAQ.common[2]],
    images: 3 + (index % 3),
  };
}

const PRODUCTS = ROWS.map(buildProduct);

/* Placeholder pictures: inline SVG, no external hosts. */

const VIEW_LABELS = ['Front view', 'Side view', 'Detail', 'Top view', 'In use'];

const SHAPES = {
  grinders:
    '<polygon points="130,110 270,110 250,60 150,60" fill="var(--c2)"/><rect x="140" y="110" width="120" height="120" rx="8" fill="var(--c1)"/>' +
    '<rect x="125" y="230" width="150" height="14" rx="4" fill="var(--c3)"/><line x1="260" y1="85" x2="325" y2="65" stroke="var(--c3)" stroke-width="8" stroke-linecap="round"/>' +
    '<circle cx="330" cy="63" r="12" fill="var(--c2)"/>',
  kettles:
    '<rect x="140" y="125" width="120" height="105" rx="22" fill="var(--c1)"/><rect x="160" y="108" width="80" height="18" rx="6" fill="var(--c3)"/>' +
    '<polygon points="258,145 312,98 318,108 262,168" fill="var(--c2)"/><path d="M140 145 C95 145 95 205 140 205" fill="none" stroke="var(--c3)" stroke-width="10"/>',
  scales:
    '<rect x="90" y="170" width="220" height="52" rx="10" fill="var(--c1)"/><rect x="170" y="182" width="60" height="26" rx="4" fill="var(--c2)"/>' +
    '<ellipse cx="200" cy="158" rx="85" ry="12" fill="var(--c3)"/>',
  filters:
    '<polygon points="115,90 285,90 215,225 185,225" fill="var(--c2)" stroke="var(--c1)" stroke-width="6" stroke-linejoin="round"/>' +
    '<line x1="150" y1="110" x2="190" y2="205" stroke="var(--c1)" stroke-width="3"/><line x1="250" y1="110" x2="210" y2="205" stroke="var(--c1)" stroke-width="3"/>' +
    '<rect x="150" y="232" width="100" height="10" rx="3" fill="var(--c3)"/>',
  accessories:
    '<rect x="165" y="115" width="70" height="115" rx="10" fill="var(--c1)"/><ellipse cx="200" cy="115" rx="35" ry="10" fill="var(--c3)"/>' +
    '<rect x="150" y="230" width="100" height="12" rx="4" fill="var(--c2)"/><circle cx="200" cy="88" r="14" fill="var(--c2)"/>',
};

function hueOf(id) {
  return [...id].reduce((sum, ch) => sum + ch.charCodeAt(0) * 7, 0) % 360;
}

function productImage(product, index) {
  const hue = (hueOf(product.id) + index * 24) % 360;
  const label = `${product.name}, ${VIEW_LABELS[index % VIEW_LABELS.length].toLowerCase()}`;
  const tilt = (index % 3) * 4 - 4;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${label}" ` +
    `style="--c1:hsl(${hue} 35% 32%);--c2:hsl(${hue} 40% 58%);--c3:hsl(${hue} 20% 22%)">` +
    `<rect width="400" height="300" fill="hsl(${hue} 35% 93%)"/>` +
    `<circle cx="${80 + index * 60}" cy="${70 + (index % 2) * 40}" r="${50 + index * 6}" fill="hsl(${hue} 40% 86%)"/>` +
    `<g transform="rotate(${tilt} 200 150)">${SHAPES[product.category]}</g>` +
    `<text x="200" y="278" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="hsl(${hue} 20% 30%)">${VIEW_LABELS[index % VIEW_LABELS.length]}</text>` +
    `</svg>`
  );
}
