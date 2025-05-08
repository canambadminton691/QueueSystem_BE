const animals = [
    // Mammals - Land
    'Panda', 'Tiger', 'Lion', 'Elephant', 'Giraffe', 'Kangaroo', 'Koala', 'Zebra', 'Bear', 'Wolf',
    'Fox', 'Deer', 'Rabbit', 'Monkey', 'Gorilla', 'Cheetah', 'Leopard', 'Hippo', 'Rhino', 'Raccoon',
    'Puma', 'Jaguar', 'Lynx', 'Bobcat', 'Coyote', 'Hyena', 'Jackal', 'Dingo', 'Meerkat', 'Mongoose',
    'Badger', 'Wolverine', 'Otter', 'Weasel', 'Ferret', 'Skunk', 'Armadillo', 'Anteater', 'Sloth',
    'Tapir', 'Bison', 'Buffalo', 'Yak', 'Camel', 'Llama', 'Alpaca', 'Gazelle', 'Antelope', 'Impala',
    'Wildebeest', 'Gnu', 'Okapi', 'Moose', 'Elk', 'Caribou', 'Reindeer', 'Pronghorn', 'Ibex', 'MountainGoat',
    'Chamois', 'Bighorn', 'Mouflon', 'Aoudad', 'Markhor', 'Takin', 'Goral', 'Serow', 'Nilgai', 'Kudu',
    'Eland', 'Oryx', 'Gemsbok', 'Addax', 'Sable', 'Roan', 'Hartebeest', 'Topi', 'Bontebok', 'Blesbok',
    'Waterbuck', 'Lechwe', 'Puku', 'Sitatunga', 'Bushbuck', 'Nyala', 'Bongo', 'GiantEland', 'GreaterKudu',
    'LesserKudu', 'Gerenuk', 'DikDik', 'Klipspringer', 'Oribi', 'Steenbok', 'Duiker', 'RoyalAntelope',
    'PygmyAntelope', 'SunBear', 'MoonBear', 'SpectacledBear', 'AndeanBear', 'PolarBear', 'BrownBear',
    'BlackBear', 'GrizzlyBear', 'KodiakBear', 'SlothBear', 'HoneyBadger', 'Wolverine', 'Fisher', 'Marten',
    'Stoat', 'Ermine', 'Mink', 'Polecat', 'Civet', 'Genet', 'Binturong', 'Fossa', 'Ringtail', 'Coati',
    'Kinkajou', 'Olingo', 'Tayra', 'Grison', 'Tayra', 'Grison', 'Tayra', 'Grison', 'Tayra', 'Grison',

    // Mammals - Marine
    'Dolphin', 'Whale', 'Seal', 'Sea Lion', 'Walrus', 'Manatee', 'Dugong', 'Narwhal', 'Beluga', 'Orca',
    'Humpback', 'BlueWhale', 'SpermWhale', 'FinWhale', 'MinkeWhale', 'BowheadWhale', 'RightWhale',
    'GrayWhale', 'BrydeWhale', 'SeiWhale', 'HarborSeal', 'GraySeal', 'HarpSeal', 'RingedSeal',
    'SpottedSeal', 'BeardedSeal', 'HoodedSeal', 'RibbonSeal', 'LeopardSeal', 'WeddellSeal',
    'CaliforniaSeaLion', 'StellerSeaLion', 'AustralianSeaLion', 'NewZealandSeaLion',
    'SouthAmericanSeaLion', 'GalapagosSeaLion', 'NorthernFurSeal', 'GuadalupeFurSeal',
    'SouthAmericanFurSeal', 'AustralianFurSeal', 'NewZealandFurSeal', 'GalapagosFurSeal',
    'AntarcticFurSeal', 'SubantarcticFurSeal', 'AmazonianManatee', 'WestIndianManatee',
    'WestAfricanManatee', 'Dugong', 'AmazonRiverDolphin', 'ChineseRiverDolphin',
    'GangesRiverDolphin', 'IndusRiverDolphin', 'IrrawaddyDolphin', 'AustralianSnubfinDolphin',

    // Birds
    'Eagle', 'Hawk', 'Falcon', 'Owl', 'Vulture', 'Condor', 'Albatross', 'Penguin', 'Flamingo', 'Peacock',
    'Parrot', 'Macaw', 'Cockatoo', 'Toucan', 'Hornbill', 'Kingfisher', 'Woodpecker', 'Hummingbird',
    'Sparrow', 'Finch', 'Canary', 'Cardinal', 'BlueJay', 'Robin', 'Thrush', 'Nightingale', 'Warbler',
    'Oriole', 'Tanager', 'Grosbeak', 'Bunting', 'Siskin', 'Crossbill', 'Goldfinch', 'Linnet',
    'Redpoll', 'Siskin', 'Crossbill', 'Goldfinch', 'Linnet', 'Redpoll', 'Siskin', 'Crossbill',
    'Goldfinch', 'Linnet', 'Redpoll', 'Siskin', 'Crossbill', 'Goldfinch', 'Linnet', 'Redpoll',
    'Siskin', 'Crossbill', 'Goldfinch', 'Linnet', 'Redpoll', 'Siskin', 'Crossbill', 'Goldfinch',
    'Linnet', 'Redpoll', 'Siskin', 'Crossbill', 'Goldfinch', 'Linnet', 'Redpoll', 'Siskin',
    'Crossbill', 'Goldfinch', 'Linnet', 'Redpoll', 'Siskin', 'Crossbill', 'Goldfinch', 'Linnet',
    'Redpoll', 'Siskin', 'Crossbill', 'Goldfinch', 'Linnet', 'Redpoll', 'Siskin', 'Crossbill',
    'Goldfinch', 'Linnet', 'Redpoll', 'Siskin', 'Crossbill', 'Goldfinch', 'Linnet', 'Redpoll',

    // Reptiles
    'Crocodile', 'Alligator', 'Snake', 'Lizard', 'Turtle', 'Tortoise', 'Chameleon', 'Iguana', 'Gecko',
    'KomodoDragon', 'MonitorLizard', 'Skink', 'Anole', 'Agama', 'Basilisk', 'BeardedDragon',
    'FrilledLizard', 'HornedLizard', 'GilaMonster', 'Boa', 'Python', 'Cobra', 'Viper', 'Rattlesnake',
    'Mamba', 'Anaconda', 'SeaTurtle', 'BoxTurtle', 'SnappingTurtle', 'SoftshellTurtle',
    'MudTurtle', 'PaintedTurtle', 'MapTurtle', 'SliderTurtle', 'Terrapin', 'GalapagosTortoise',
    'AldabraTortoise', 'LeopardTortoise', 'SulcataTortoise', 'HermannTortoise', 'GreekTortoise',
    'RussianTortoise', 'EgyptianTortoise', 'IndianStarTortoise', 'BurmeseStarTortoise',
    'RadiatedTortoise', 'PancakeTortoise', 'HingeBackTortoise', 'SpiderTortoise', 'AngulatedTortoise',
    'ParrotBeakedTortoise', 'ElongatedTortoise', 'ForstenTortoise', 'TravancoreTortoise',
    'ImpressedTortoise', 'HomeTortoise', 'ForestTortoise', 'YellowFootedTortoise',
    'RedFootedTortoise', 'CherryHeadTortoise', 'ChacoTortoise', 'BolsonTortoise',
    'DesertTortoise', 'GopherTortoise', 'TexasTortoise', 'SonoranDesertTortoise',
    'MojaveDesertTortoise', 'AgassizDesertTortoise', 'MorafkaDesertTortoise',
    'GoodeDesertTortoise', 'BerlandierTortoise', 'TexasTortoise', 'SonoranDesertTortoise',

    // Amphibians
    'Frog', 'Toad', 'Salamander', 'Newt', 'Caecilian', 'TreeFrog', 'Bullfrog', 'LeopardFrog',
    'PoisonDartFrog', 'FireBelliedToad', 'Axolotl', 'Mudpuppy', 'Hellbender', 'TigerSalamander',
    'SpottedSalamander', 'RedSpottedNewt', 'EasternNewt', 'RoughSkinnedNewt', 'CaliforniaNewt',
    'RedBelliedNewt', 'AlpineNewt', 'CrestedNewt', 'MarbledNewt', 'PalmateNewt', 'SmoothNewt',
    'GreatCrestedNewt', 'WartyNewt', 'FireSalamander', 'TigerSalamander', 'SpottedSalamander',
    'RedSpottedNewt', 'EasternNewt', 'RoughSkinnedNewt', 'CaliforniaNewt', 'RedBelliedNewt',
    'AlpineNewt', 'CrestedNewt', 'MarbledNewt', 'PalmateNewt', 'SmoothNewt', 'GreatCrestedNewt',
    'WartyNewt', 'FireSalamander', 'TigerSalamander', 'SpottedSalamander', 'RedSpottedNewt',
    'EasternNewt', 'RoughSkinnedNewt', 'CaliforniaNewt', 'RedBelliedNewt', 'AlpineNewt',
    'CrestedNewt', 'MarbledNewt', 'PalmateNewt', 'SmoothNewt', 'GreatCrestedNewt', 'WartyNewt',
    'FireSalamander', 'TigerSalamander', 'SpottedSalamander', 'RedSpottedNewt', 'EasternNewt',
    'RoughSkinnedNewt', 'CaliforniaNewt', 'RedBelliedNewt', 'AlpineNewt', 'CrestedNewt',
    'MarbledNewt', 'PalmateNewt', 'SmoothNewt', 'GreatCrestedNewt', 'WartyNewt', 'FireSalamander',

    // Fish
    'Shark', 'Tuna', 'Salmon', 'Trout', 'Bass', 'Catfish', 'Pike', 'Perch', 'Carp', 'Goldfish',
    'Angelfish', 'Betta', 'Guppy', 'Molly', 'Platy', 'Swordtail', 'Tetra', 'Danio', 'Rasbora',
    'Barracuda', 'Marlin', 'Sailfish', 'Swordfish', 'Tuna', 'Mackerel', 'Sardine', 'Anchovy',
    'Herring', 'Cod', 'Haddock', 'Halibut', 'Flounder', 'Sole', 'Turbot', 'Bream', 'Snapper',
    'Grouper', 'Bass', 'Perch', 'Pike', 'Walleye', 'Catfish', 'Carp', 'Goldfish', 'Koi',
    'Angelfish', 'Betta', 'Guppy', 'Molly', 'Platy', 'Swordtail', 'Tetra', 'Danio', 'Rasbora',
    'Barracuda', 'Marlin', 'Sailfish', 'Swordfish', 'Tuna', 'Mackerel', 'Sardine', 'Anchovy',
    'Herring', 'Cod', 'Haddock', 'Halibut', 'Flounder', 'Sole', 'Turbot', 'Bream', 'Snapper',
    'Grouper', 'Bass', 'Perch', 'Pike', 'Walleye', 'Catfish', 'Carp', 'Goldfish', 'Koi',
    'Angelfish', 'Betta', 'Guppy', 'Molly', 'Platy', 'Swordtail', 'Tetra', 'Danio', 'Rasbora',

    // Insects
    'Butterfly', 'Moth', 'Bee', 'Wasp', 'Ant', 'Termite', 'Beetle', 'Ladybug', 'Dragonfly',
    'Grasshopper', 'Cricket', 'Cockroach', 'PrayingMantis', 'StickInsect', 'WalkingStick',
    'Katydid', 'Cicada', 'Aphid', 'StinkBug', 'BedBug', 'Flea', 'Tick', 'Mosquito', 'Fly',
    'Horsefly', 'Deerfly', 'Blackfly', 'Sandfly', 'FruitFly', 'Housefly', 'Blowfly', 'Firefly',
    'LightningBug', 'Earwig', 'Silverfish', 'Booklouse', 'Thrip', 'Whitefly', 'ScaleInsect',
    'Mealybug', 'WoollyAphid', 'GallWasp', 'IchneumonWasp', 'BraconidWasp', 'ChalcidWasp',
    'FigWasp', 'PaperWasp', 'YellowJacket', 'Hornet', 'Bumblebee', 'Honeybee', 'CarpenterBee',
    'MiningBee', 'LeafcutterBee', 'MasonBee', 'SweatBee', 'DiggerBee', 'PlastererBee',
    'CarderBee', 'WoolCarderBee', 'ResinBee', 'MaskedBee', 'NomadBee', 'CuckooBee',
    'VultureBee', 'OrchidBee', 'BlueBandedBee', 'TeddyBearBee', 'GreenCarpenterBee',
    'RedMasonBee', 'AshyMiningBee', 'CommonCarderBee', 'BuffTailedBumblebee',
    'WhiteTailedBumblebee', 'EarlyBumblebee', 'TreeBumblebee', 'GardenBumblebee',
    'HeathBumblebee', 'FieldCuckooBumblebee', 'ForestCuckooBumblebee', 'GypsyCuckooBumblebee',
    'BarbutCuckooBumblebee', 'FieldBumblebee', 'GardenBumblebee', 'HeathBumblebee',
    'TreeBumblebee', 'EarlyBumblebee', 'WhiteTailedBumblebee', 'BuffTailedBumblebee',
    'CommonCarderBee', 'AshyMiningBee', 'RedMasonBee', 'GreenCarpenterBee', 'TeddyBearBee',
    'BlueBandedBee', 'OrchidBee', 'VultureBee', 'CuckooBee', 'NomadBee', 'MaskedBee',
    'ResinBee', 'WoolCarderBee', 'CarderBee', 'PlastererBee', 'DiggerBee', 'SweatBee',
    'MasonBee', 'LeafcutterBee', 'MiningBee', 'CarpenterBee', 'Honeybee', 'Bumblebee',
    'Hornet', 'YellowJacket', 'PaperWasp', 'FigWasp', 'ChalcidWasp', 'BraconidWasp',
    'IchneumonWasp', 'GallWasp', 'WoollyAphid', 'Mealybug', 'ScaleInsect', 'Whitefly',
    'Thrip', 'Booklouse', 'Silverfish', 'Earwig', 'LightningBug', 'Firefly', 'Blowfly',
    'Housefly', 'FruitFly', 'Sandfly', 'Blackfly', 'Deerfly', 'Horsefly', 'Fly', 'Mosquito',
    'Tick', 'Flea', 'BedBug', 'StinkBug', 'Aphid', 'Cicada', 'Katydid', 'WalkingStick',
    'StickInsect', 'PrayingMantis', 'Cockroach', 'Cricket', 'Grasshopper', 'Dragonfly',
    'Ladybug', 'Beetle', 'Termite', 'Ant', 'Wasp', 'Bee', 'Moth', 'Butterfly'
];
  
async function getUniqueAnimalName(User) {
    // Get current date in PST
    const now = new Date();
    const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const startOfDay = new Date(pstDate);
    startOfDay.setHours(0, 0, 0, 0);
  
    // Get all currently active users (registered today)
    const activeUsers = await User.find({
      createdAt: { $gte: startOfDay }
    });
  
    // Get list of animal names currently in use
    const usedAnimalNames = new Set(activeUsers.map(user => user.animalName));
  
    // Get available animal names
    const availableAnimals = animals.filter(animal => !usedAnimalNames.has(animal));
  
    if (availableAnimals.length === 0) {
      throw new Error('No more animal names available. Please try again later.');
    }
  
    // Return a random available animal name
    return availableAnimals[Math.floor(Math.random() * availableAnimals.length)];
  }
  
  module.exports = {
    animals,
    getUniqueAnimalName
  };