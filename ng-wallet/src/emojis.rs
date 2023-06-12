// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::collections::HashMap;
pub struct EmojiDef<'a> {
    pub hexcode: &'a str,
    pub shortcode: &'a str,
    pub code: &'a str,
}

const face: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f600",
        shortcode: "grinning_face",
        code: "happy",
    },
    EmojiDef {
        hexcode: "1f602",
        shortcode: "face_with_tears_of_joy",
        code: "happy_tears",
    },
    EmojiDef {
        hexcode: "1f607",
        shortcode: "smiling_face_with_halo",
        code: "halo",
    },
    EmojiDef {
        hexcode: "1f970",
        shortcode: "smiling_face_with_hearts",
        code: "three_hearts",
    },
    EmojiDef {
        hexcode: "1f60d",
        shortcode: "smiling_face_with_heart_eyes",
        code: "two_hearts",
    },
    EmojiDef {
        hexcode: "1f618",
        shortcode: "face_blowing_a_kiss",
        code: "one_heart",
    },
    EmojiDef {
        hexcode: "1f61d",
        shortcode: "squinting_face_with_tongue",
        code: "tongue",
    },
    EmojiDef {
        hexcode: "1f917",
        shortcode: "hugging_face",
        code: "two_hands",
    },
    EmojiDef {
        hexcode: "1f92d",
        shortcode: "face_with_hand_over_mouth",
        code: "one_hand",
    },
    EmojiDef {
        hexcode: "1f910",
        shortcode: "zipper_mouth_face",
        code: "silenced",
    },
    EmojiDef {
        hexcode: "1f973",
        shortcode: "partying_face",
        code: "celebrating",
    },
    EmojiDef {
        hexcode: "1f60e",
        shortcode: "smiling_face_with_sunglasses",
        code: "sunglasses",
    },
    EmojiDef {
        hexcode: "1f644",
        shortcode: "face_with_rolling_eyes",
        code: "eyes_up",
    },
    EmojiDef {
        hexcode: "1f9d0",
        shortcode: "face_with_monocle",
        code: "monocole",
    },
    EmojiDef {
        hexcode: "1f634",
        shortcode: "sleeping_face",
        code: "sleeping",
    },
];

const face_unwell: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f637",
        shortcode: "face_with_medical_mask",

        code: "mask",
    },
    EmojiDef {
        hexcode: "1f912",
        shortcode: "face_with_thermometer",
        code: "thermometer",
    },
    EmojiDef {
        hexcode: "1f915",
        shortcode: "face_with_head_bandage",
        code: "bandage",
    },
    EmojiDef {
        hexcode: "1f92e",
        shortcode: "face_vomiting",
        code: "vomit",
    },
    EmojiDef {
        hexcode: "1f927",
        shortcode: "sneezing_face",
        code: "tissue",
    },
    EmojiDef {
        hexcode: "1f915",
        shortcode: "hot_face",
        code: "hot",
    },
    EmojiDef {
        hexcode: "1f976",
        shortcode: "cold_face",
        code: "cold",
    },
    EmojiDef {
        hexcode: "1f635",
        shortcode: "knocked_out_face",
        code: "crossed_eyes",
    },
    EmojiDef {
        hexcode: "1f92f",
        shortcode: "exploding_head",
        code: "explosion",
    },
    EmojiDef {
        hexcode: "2639",
        shortcode: "frowning_face",
        code: "sad",
    },
    EmojiDef {
        hexcode: "1f925",
        shortcode: "lying_face",
        code: "long_nose",
    },
    EmojiDef {
        hexcode: "1f62d",
        shortcode: "loudly_crying_face",
        code: "many_tears",
    },
    EmojiDef {
        hexcode: "1f631",
        shortcode: "face_screaming_in_fear",
        code: "fear",
    },
    EmojiDef {
        hexcode: "1f971",
        shortcode: "yawning_face",
        code: "tired",
    },
    EmojiDef {
        hexcode: "1f624",
        shortcode: "face_with_steam_from_nose",
        code: "annoyed",
    },
];

const face_costume: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f921",
        shortcode: "clown_face",
        code: "clown",
    },
    EmojiDef {
        hexcode: "1f47b",
        shortcode: "ghost",
        code: "ghost",
    },
    EmojiDef {
        hexcode: "1f436",
        shortcode: "dog_face",
        code: "dog",
    },
    EmojiDef {
        hexcode: "1f638",
        shortcode: "grinning_cat_with_smiling_eyes",
        code: "happy_cat",
    },
    EmojiDef {
        hexcode: "1f640",
        shortcode: "weary_cat",
        code: "scared_cat",
    },
    EmojiDef {
        hexcode: "1f63f",
        shortcode: "crying_cat",
        code: "sad_cat",
    },
    EmojiDef {
        hexcode: "1f648",
        shortcode: "see_no_evil_monkey",
        code: "monkey_no_see",
    },
    EmojiDef {
        hexcode: "1f649",
        shortcode: "hear_no_evil_monkey",
        code: "monkey_no_hear",
    },
    EmojiDef {
        hexcode: "1f64a",
        shortcode: "speak_no_evil_monkey",
        code: "monkey_no_talk",
    },
    EmojiDef {
        hexcode: "1f477",
        shortcode: "construction_worker",
        code: "builder",
    },
    EmojiDef {
        hexcode: "1f478",
        shortcode: "princess",
        code: "princess",
    },
    EmojiDef {
        hexcode: "1f9d1_200d_1f692",
        shortcode: "firefighter",
        code: "firefighter",
    },
    EmojiDef {
        hexcode: "1f9d9",
        shortcode: "mage",
        code: "mage",
    },
    EmojiDef {
        hexcode: "1f9dc",
        shortcode: "merperson",
        code: "mermaid",
    },
    EmojiDef {
        hexcode: "1f9da",
        shortcode: "fairy",
        code: "fairy",
    },
];

const emotion: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f48c",
        shortcode: "love_letter",
        code: "letter_heart",
    },
    EmojiDef {
        hexcode: "2764",
        shortcode: "red_heart",
        code: "one_heart",
    },
    EmojiDef {
        hexcode: "1f495",
        shortcode: "two_hearts",
        code: "two_hearts",
    },
    EmojiDef {
        hexcode: "1f48b",
        shortcode: "kiss_mark",
        code: "kiss",
    },
    EmojiDef {
        hexcode: "1f4af",
        shortcode: "hundred_points",
        code: "hundred",
    },
    EmojiDef {
        hexcode: "1f4a5",
        shortcode: "collision",
        code: "explosion",
    },
    EmojiDef {
        hexcode: "1f4a6",
        shortcode: "sweat_droplets",
        code: "drops",
    },
    EmojiDef {
        hexcode: "1f91d",
        shortcode: "handshake",
        code: "handshake",
    },
    EmojiDef {
        hexcode: "1f590",
        shortcode: "hand_with_fingers_splayed",
        code: "hand_five_fingers",
    },
    EmojiDef {
        hexcode: "270c",
        shortcode: "victory_hand",
        code: "hand_two_fingers",
    },
    EmojiDef {
        hexcode: "1f44d",
        shortcode: "thumbs_up",
        code: "thumbs_up",
    },
    EmojiDef {
        hexcode: "270a",
        shortcode: "raised_fist",
        code: "fist",
    },
    EmojiDef {
        hexcode: "1f450",
        shortcode: "open_hands",
        code: "two_hands",
    },
    EmojiDef {
        hexcode: "270d",
        shortcode: "writing_hand",
        code: "writing",
    },
    EmojiDef {
        hexcode: "1f64f",
        shortcode: "folded_hands",
        code: "praying",
    },
];

const body: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f4aa",
        shortcode: "flexed_biceps",
        code: "arm",
    },
    EmojiDef {
        hexcode: "1f9b5",
        shortcode: "leg",
        code: "leg",
    },
    EmojiDef {
        hexcode: "1f9b6",
        shortcode: "foot",
        code: "foot",
    },
    EmojiDef {
        hexcode: "1f442",
        shortcode: "ear",
        code: "ear",
    },
    EmojiDef {
        hexcode: "1f443",
        shortcode: "nose",
        code: "nose",
    },
    EmojiDef {
        hexcode: "1f9e0",
        shortcode: "brain",
        code: "brain",
    },
    EmojiDef {
        hexcode: "1f9b7",
        shortcode: "tooth",
        code: "tooth",
    },
    EmojiDef {
        hexcode: "1f9b4",
        shortcode: "bone",
        code: "bone",
    },
    EmojiDef {
        hexcode: "1f441",
        shortcode: "eye",
        code: "eye",
    },
    EmojiDef {
        hexcode: "1f445",
        shortcode: "tongue",
        code: "tongue",
    },
    EmojiDef {
        hexcode: "1f444",
        shortcode: "mouth",
        code: "mouth",
    },
    EmojiDef {
        hexcode: "1f455",
        shortcode: "t_shirt",
        code: "shirt",
    },
    EmojiDef {
        hexcode: "1f456",
        shortcode: "jeans",
        code: "pants",
    },
    EmojiDef {
        hexcode: "1f457",
        shortcode: "dress",
        code: "dress",
    },
    EmojiDef {
        hexcode: "1f45f",
        shortcode: "running_shoe",
        code: "shoe",
    },
];

const sport: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f93a",
        shortcode: "person_fencing",
        code: "fencing",
    },
    EmojiDef {
        hexcode: "1f3c7",
        shortcode: "horse_racing",
        code: "horse_riding",
    },
    EmojiDef {
        hexcode: "26f7",
        shortcode: "skier",
        code: "ski",
    },
    EmojiDef {
        hexcode: "1f6a3",
        shortcode: "person_rowing_boat",
        code: "boat",
    },
    EmojiDef {
        hexcode: "1f3ca",
        shortcode: "person_swimming",
        code: "swim",
    },
    EmojiDef {
        hexcode: "1f3c4",
        shortcode: "person_surfing",
        code: "surf",
    },
    EmojiDef {
        hexcode: "1f3cb",
        shortcode: "person_lifting_weights",
        code: "gym",
    },
    EmojiDef {
        hexcode: "1f93c",
        shortcode: "people_wrestling",
        code: "wrestling",
    },
    EmojiDef {
        hexcode: "1f6b4",
        shortcode: "person_biking",
        code: "bike",
    },
    EmojiDef {
        hexcode: "1fa82",
        shortcode: "parachute",
        code: "parachute",
    },
    EmojiDef {
        hexcode: "26bd",
        shortcode: "soccer_ball",
        code: "football",
    },
    EmojiDef {
        hexcode: "1f3c0",
        shortcode: "basketball",
        code: "basketball",
    },
    EmojiDef {
        hexcode: "1f3be",
        shortcode: "tennis",
        code: "tennis",
    },
    EmojiDef {
        hexcode: "1f3d3",
        shortcode: "ping_pong",
        code: "ping_pong",
    },
    EmojiDef {
        hexcode: "1f94b",
        shortcode: "martial_arts_uniform",
        code: "martial",
    },
];

const mammal: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f981",
        shortcode: "lion",
        code: "lion",
    },
    EmojiDef {
        hexcode: "1f406",
        shortcode: "leopard",
        code: "leopard",
    },
    EmojiDef {
        hexcode: "1f434",
        shortcode: "horse_face",
        code: "horse",
    },
    EmojiDef {
        hexcode: "1f993",
        shortcode: "zebra",
        code: "zebra",
    },
    EmojiDef {
        hexcode: "1f416",
        shortcode: "pig",
        code: "pig",
    },
    EmojiDef {
        hexcode: "1f410",
        shortcode: "goat",
        code: "goat",
    },
    EmojiDef {
        hexcode: "1f411",
        shortcode: "ewe",
        code: "sheep",
    },
    EmojiDef {
        hexcode: "1f42a",
        shortcode: "camel",
        code: "camel",
    },
    EmojiDef {
        hexcode: "1f992",
        shortcode: "giraffe",
        code: "giraffe",
    },
    EmojiDef {
        hexcode: "1f418",
        shortcode: "elephant",
        code: "elephant",
    },
    EmojiDef {
        hexcode: "1f98f",
        shortcode: "rhinoceros",
        code: "rhinoceros",
    },
    EmojiDef {
        hexcode: "1f407",
        shortcode: "rabbit",
        code: "rabbit",
    },
    EmojiDef {
        hexcode: "1f994",
        shortcode: "hedgehog",
        code: "hedgehog",
    },
    EmojiDef {
        hexcode: "1f987",
        shortcode: "bat",
        code: "bat",
    },
    EmojiDef {
        hexcode: "1f43b_200d_2744",
        shortcode: "polar_bear",
        code: "bear",
    },
];

const fauna: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f413",
        shortcode: "rooster",
        code: "chicken",
    },
    EmojiDef {
        hexcode: "1f423",
        shortcode: "hatching_chick",
        code: "chick",
    },
    EmojiDef {
        hexcode: "1f985",
        shortcode: "eagle",
        code: "eagle",
    },
    EmojiDef {
        hexcode: "1f986",
        shortcode: "duck",
        code: "duck",
    },
    EmojiDef {
        hexcode: "1f989",
        shortcode: "owl",
        code: "owl",
    },
    EmojiDef {
        hexcode: "1f9a9",
        shortcode: "flamingo",
        code: "flamingo",
    },
    EmojiDef {
        hexcode: "1f427",
        shortcode: "penguin",
        code: "penguin",
    },
    EmojiDef {
        hexcode: "1f98e",
        shortcode: "lizard",
        code: "lizard",
    },
    EmojiDef {
        hexcode: "1f422",
        shortcode: "turtle",
        code: "turtle",
    },
    EmojiDef {
        hexcode: "1f40d",
        shortcode: "snake",
        code: "snake",
    },
    EmojiDef {
        hexcode: "1f433",
        shortcode: "spouting_whale",
        code: "whale",
    },
    EmojiDef {
        hexcode: "1f42c",
        shortcode: "dolphin",
        code: "dolphin",
    },
    EmojiDef {
        hexcode: "1f41f",
        shortcode: "fish",
        code: "fish",
    },
    EmojiDef {
        hexcode: "1f41a",
        shortcode: "spiral_shell",
        code: "shell",
    },
    EmojiDef {
        hexcode: "1f419",
        shortcode: "octopus",
        code: "octopus",
    },
];

const flora: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f40c",
        shortcode: "snail",
        code: "snail",
    },
    EmojiDef {
        hexcode: "1f98b",
        shortcode: "butterfly",
        code: "butterfly",
    },
    EmojiDef {
        hexcode: "1f41c",
        shortcode: "ant",
        code: "ant",
    },
    EmojiDef {
        hexcode: "1f41d",
        shortcode: "honeybee",
        code: "bee",
    },
    EmojiDef {
        hexcode: "1f41e",
        shortcode: "lady_beetle",
        code: "beetle",
    },
    EmojiDef {
        hexcode: "1f339",
        shortcode: "rose",
        code: "rose",
    },
    EmojiDef {
        hexcode: "1f33b",
        shortcode: "sunflower",
        code: "sunflower",
    },
    EmojiDef {
        hexcode: "1f332",
        shortcode: "evergreen_tree",
        code: "fir",
    },
    EmojiDef {
        hexcode: "1f334",
        shortcode: "palm_tree",
        code: "palm_tree",
    },
    EmojiDef {
        hexcode: "1f335",
        shortcode: "cactus",
        code: "cactus",
    },
    EmojiDef {
        hexcode: "1f340",
        shortcode: "four_leaf_clover",
        code: "clover",
    },
    EmojiDef {
        hexcode: "1fab4",
        shortcode: "potted_plant",
        code: "plant",
    },
    EmojiDef {
        hexcode: "1f490",
        shortcode: "bouquet",
        code: "bouquet",
    },
    EmojiDef {
        hexcode: "1f342",
        shortcode: "fallen_leaf",
        code: "three_leaves",
    },
    EmojiDef {
        hexcode: "1f344",
        shortcode: "mushroom",
        code: "mushroom",
    },
];

const greens: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f347",
        shortcode: "grapes",
        code: "grapes",
    },
    EmojiDef {
        hexcode: "1f349",
        shortcode: "watermelon",
        code: "watermelon",
    },
    EmojiDef {
        hexcode: "1f34b",
        shortcode: "lemon",
        code: "lemon",
    },
    EmojiDef {
        hexcode: "1f34c",
        shortcode: "banana",
        code: "banana",
    },
    EmojiDef {
        hexcode: "1f34d",
        shortcode: "pineapple",
        code: "pineapple",
    },
    EmojiDef {
        hexcode: "1f34e",
        shortcode: "red_apple",
        code: "apple",
    },
    EmojiDef {
        hexcode: "1f352",
        shortcode: "cherries",
        code: "cherries",
    },
    EmojiDef {
        hexcode: "1f353",
        shortcode: "strawberry",
        code: "strawberry",
    },
    EmojiDef {
        hexcode: "1fad0",
        shortcode: "blueberries",
        code: "three_blueberries",
    },
    EmojiDef {
        hexcode: "1f95d",
        shortcode: "kiwi_fruit",
        code: "kiwi",
    },
    EmojiDef {
        hexcode: "1f951",
        shortcode: "avocado",
        code: "avocado",
    },
    EmojiDef {
        hexcode: "1f346",
        shortcode: "eggplant",
        code: "eggplant",
    },
    EmojiDef {
        hexcode: "1f955",
        shortcode: "carrot",
        code: "carrot",
    },
    EmojiDef {
        hexcode: "1f33d",
        shortcode: "ear_of_corn",
        code: "corn",
    },
    EmojiDef {
        hexcode: "1f336",
        shortcode: "hot_pepper",
        code: "pepper",
    },
];

const foods: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f950",
        shortcode: "croissant",
        code: "croissant",
    },
    EmojiDef {
        hexcode: "1f956",
        shortcode: "baguette_bread",
        code: "bread",
    },
    EmojiDef {
        hexcode: "1f968",
        shortcode: "pretzel",
        code: "pretzel",
    },
    EmojiDef {
        hexcode: "1f9c0",
        shortcode: "cheese_wedge",
        code: "cheese",
    },
    EmojiDef {
        hexcode: "1f355",
        shortcode: "pizza",
        code: "pizza",
    },
    EmojiDef {
        hexcode: "1f373",
        shortcode: "cooking",
        code: "egg",
    },
    EmojiDef {
        hexcode: "1f366",
        shortcode: "soft_ice_cream",
        code: "ice_cream",
    },
    EmojiDef {
        hexcode: "1f36a",
        shortcode: "cookie",
        code: "cookie",
    },
    EmojiDef {
        hexcode: "1f370",
        shortcode: "shortcake",
        code: "cake",
    },
    EmojiDef {
        hexcode: "1f36b",
        shortcode: "chocolate_bar",
        code: "chocolate",
    },
    EmojiDef {
        hexcode: "1f36c",
        shortcode: "candy",
        code: "sweet",
    },
    EmojiDef {
        hexcode: "2615",
        shortcode: "hot_beverage",
        code: "coffee",
    },
    EmojiDef {
        hexcode: "1f37e",
        shortcode: "bottle_with_popping_cork",
        code: "champagne",
    },
    EmojiDef {
        hexcode: "1f377",
        shortcode: "wine_glass",
        code: "glass_wine",
    },
    EmojiDef {
        hexcode: "1f942",
        shortcode: "clinking_glasses",
        code: "two_glasses",
    },
];

const travel: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f3d4",
        shortcode: "snow_capped_mountain",
        code: "mountain",
    },
    EmojiDef {
        hexcode: "1f3d5",
        shortcode: "camping",
        code: "camping",
    },
    EmojiDef {
        hexcode: "1f3d6",
        shortcode: "beach_with_umbrella",
        code: "beach",
    },
    EmojiDef {
        hexcode: "1f9ed",
        shortcode: "compass",
        code: "compass",
    },
    EmojiDef {
        hexcode: "1f3db",
        shortcode: "classical_building",
        code: "museum",
    },
    EmojiDef {
        hexcode: "1f3e1",
        shortcode: "house_with_garden",
        code: "house",
    },
    EmojiDef {
        hexcode: "26f2",
        shortcode: "fountain",
        code: "fountain",
    },
    EmojiDef {
        hexcode: "1f3aa",
        shortcode: "circus_tent",
        code: "circus",
    },
    EmojiDef {
        hexcode: "1f682",
        shortcode: "locomotive",
        code: "train",
    },
    EmojiDef {
        hexcode: "1f695",
        shortcode: "taxi",
        code: "car",
    },
    EmojiDef {
        hexcode: "1f3cd",
        shortcode: "motorcycle",
        code: "motorcycle",
    },
    EmojiDef {
        hexcode: "26f5",
        shortcode: "sailboat",
        code: "sailboat",
    },
    EmojiDef {
        hexcode: "2708",
        shortcode: "airplane",
        code: "airplane",
    },
    EmojiDef {
        hexcode: "1f681",
        shortcode: "helicopter",
        code: "helicopter",
    },
    EmojiDef {
        hexcode: "1f680",
        shortcode: "rocket",
        code: "rocket",
    },
];

const sky: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "2600",
        shortcode: "sun",
        code: "sun",
    },
    EmojiDef {
        hexcode: "1f319",
        shortcode: "crescent_moon",
        code: "moon",
    },
    EmojiDef {
        hexcode: "1fa90",
        shortcode: "ringed_planet",
        code: "planet",
    },
    EmojiDef {
        hexcode: "2b50",
        shortcode: "star",
        code: "star",
    },
    EmojiDef {
        hexcode: "1f30c",
        shortcode: "milky_way",
        code: "night_sky",
    },
    EmojiDef {
        hexcode: "1f327",
        shortcode: "cloud_with_rain",
        code: "cloud",
    },
    EmojiDef {
        hexcode: "2614",
        shortcode: "umbrella_with_rain_drops",
        code: "umbrella",
    },
    EmojiDef {
        hexcode: "26a1",
        shortcode: "high_voltage",
        code: "lightning",
    },
    EmojiDef {
        hexcode: "2744",
        shortcode: "snowflake",
        code: "snow",
    },
    EmojiDef {
        hexcode: "26c4",
        shortcode: "snowman_without_snow",
        code: "snowman",
    },
    EmojiDef {
        hexcode: "1f321",
        shortcode: "thermometer",
        code: "thermometer",
    },
    EmojiDef {
        hexcode: "1f525",
        shortcode: "fire",
        code: "fire",
    },
    EmojiDef {
        hexcode: "1f388",
        shortcode: "balloon",
        code: "balloon",
    },
    EmojiDef {
        hexcode: "1fa81",
        shortcode: "kite",
        code: "kite",
    },
    EmojiDef {
        hexcode: "1f308",
        shortcode: "rainbow",
        code: "rainbow",
    },
];

const play: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f3b8",
        shortcode: "guitar",
        code: "guitar",
    },
    EmojiDef {
        hexcode: "1f3b7",
        shortcode: "saxophone",
        code: "saxophone",
    },
    EmojiDef {
        hexcode: "1f3b5",
        shortcode: "musical_note",
        code: "music",
    },
    EmojiDef {
        hexcode: "1f3a8",
        shortcode: "artist_palette",
        code: "painting",
    },
    EmojiDef {
        hexcode: "265f",
        shortcode: "chess_pawn",
        code: "chess",
    },
    EmojiDef {
        hexcode: "1f381",
        shortcode: "wrapped_gift",
        code: "gift",
    },
    EmojiDef {
        hexcode: "1f3b2",
        shortcode: "game_die",
        code: "die",
    },
    EmojiDef {
        hexcode: "1f9e9",
        shortcode: "puzzle_piece",
        code: "puzzle",
    },
    EmojiDef {
        hexcode: "1f9f8",
        shortcode: "teddy_bear",
        code: "teddy_bear",
    },
    EmojiDef {
        hexcode: "1f9e8",
        shortcode: "firecracker",
        code: "firecracker",
    },
    EmojiDef {
        hexcode: "1f3af",
        shortcode: "bullseye",
        code: "bullseye",
    },
    EmojiDef {
        hexcode: "1f6fc",
        shortcode: "roller_skate",
        code: "roller_skate",
    },
    EmojiDef {
        hexcode: "1f6f4",
        shortcode: "kick_scooter",
        code: "kick_scooter",
    },
    EmojiDef {
        hexcode: "2693",
        shortcode: "anchor",
        code: "anchor",
    },
    EmojiDef {
        hexcode: "1f93f",
        shortcode: "diving_mask",
        code: "scuba_diving",
    },
];

const house: [EmojiDef<'static>; 15] = [
    EmojiDef {
        hexcode: "1f9f9",
        shortcode: "broom",
        code: "broom",
    },
    EmojiDef {
        hexcode: "1f50d",
        shortcode: "magnifying_glass_tilted_left",
        code: "magnifying_glass",
    },
    EmojiDef {
        hexcode: "1f4a1",
        shortcode: "light_bulb",
        code: "bulb",
    },
    EmojiDef {
        hexcode: "1f4da",
        shortcode: "books",
        code: "three_books",
    },
    EmojiDef {
        hexcode: "1f4e6",
        shortcode: "package",
        code: "package",
    },
    EmojiDef {
        hexcode: "270f",
        shortcode: "pencil",
        code: "pencil",
    },
    EmojiDef {
        hexcode: "1f4cc",
        shortcode: "pushpin",
        code: "pin",
    },
    EmojiDef {
        hexcode: "1f4ce",
        shortcode: "paperclip",
        code: "paperclip",
    },
    EmojiDef {
        hexcode: "2702",
        shortcode: "scissors",
        code: "scissors",
    },
    EmojiDef {
        hexcode: "1f511",
        shortcode: "key",
        code: "key",
    },
    EmojiDef {
        hexcode: "1f513",
        shortcode: "unlocked",
        code: "lock",
    },
    EmojiDef {
        hexcode: "1fa91",
        shortcode: "chair",
        code: "chair",
    },
    EmojiDef {
        hexcode: "1f6c1",
        shortcode: "bathtub",
        code: "bathtub",
    },
    EmojiDef {
        hexcode: "1f9fd",
        shortcode: "sponge",
        code: "sponge",
    },
    EmojiDef {
        hexcode: "1f6d2",
        shortcode: "shopping_cart",
        code: "shopping_cart",
    },
];

lazy_static! {
    pub static ref EMOJIS: HashMap<&'static str, [EmojiDef<'static>; 15]> = vec![
        ("face", face),
        ("face_unwell", face_unwell),
        ("face_costume", face_costume),
        ("emotion", emotion),
        ("body", body),
        ("sport", sport),
        ("mammal", mammal),
        ("fauna", fauna),
        ("flora", flora),
        ("greens", greens),
        ("foods", foods),
        ("travel", travel),
        ("sky", sky),
        ("play", play),
        ("house", play),
    ]
    .into_iter()
    .collect();
}

pub const EMOJI_CAT: [&str; 15] = [
    "face",
    "sport",
    "mammal",
    "fauna",
    "flora",
    "greens",
    "foods",
    "travel",
    "sky",
    "body",
    "face_unwell",
    "house",
    "play",
    "face_costume",
    "emotion",
];
