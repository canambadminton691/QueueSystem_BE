const animals = [
    // Mammals - Land (150)
    'Panda', 'Tiger', 'Lion', 'Elephant', 'Giraffe', 'Kangaroo', 'Koala', 'Zebra', 'Bear', 'Wolf', 
    'Fox', 'Deer', 'Rabbit', 'Monkey', 'Gorilla', 'Cheetah', 'Leopard', 'Hippo', 'Rhino', 'Raccoon',
    'Otter', 'Alpaca', 'Antelope', 'Armadillo', 'Badger', 'Beaver', 'Bison', 'Boar', 'Camel', 'Capybara',
    'Chimpanzee', 'Chinchilla', 'Cougar', 'Coyote', 'Donkey', 'Ferret', 'Gazelle', 'Hamster', 'Hedgehog', 'Jaguar',
    'Lemur', 'Llama', 'Lynx', 'Meerkat', 'Mole', 'Mongoose', 'Moose', 'Ocelot', 'Orangutan', 'Platypus',
    'Porcupine', 'Possum', 'Puma', 'Quokka', 'Reindeer', 'Sloth', 'Squirrel', 'Tapir', 'Weasel', 'Wolverine',
    'Wombat', 'Yak', 'Aardvark', 'Baboon', 'Buffalo', 'Caracal', 'Dingo', 'Echidna', 'Fennec', 'Gibbon',
    'Hare', 'Impala', 'Jackal', 'Kudu', 'Loris', 'Mammoth', 'Numbat', 'Okapi', 'Pangolin', 'Quoll',
    'Serval', 'Tarsier', 'Uakari', 'Vicuna', 'Wallaby', 'Xerus', 'Yapok', 'Zebu', 'Anteater', 'Babirusa',
    'Civet', 'Dhole', 'Ermine', 'Fossa', 'Gemsbok', 'Hyena', 'Ibex', 'Jerboa', 'Klipspringer', 'Lemming',
    'Margay', 'Nyala', 'Oribi', 'Pudu', 'Quagga', 'Reedbuck', 'Sable', 'Takin', 'Urial', 'Vole',
    'Waterbuck', 'Xerus', 'Yakin', 'Zorilla', 'Addax', 'Bandicoot', 'Coati', 'Dormouse', 'Elk', 'Galago',
    'Hartebeest', 'Indri', 'Jaguarundi', 'Kinkajou', 'Langur', 'Markhor', 'Nilgai', 'Oncilla', 'Paca', 'Ratel',
    'Sifaka', 'Tamarin', 'Urchin', 'Viscacha', 'Wisent', 'Xerus', 'Yak', 'Zebra', 'Agouti', 'Binturong',

    // Birds (125)
    'Eagle', 'Owl', 'Penguin', 'Albatross', 'Canary', 'Cardinal', 'Condor', 'Crane', 'Crow', 'Dove',
    'Duck', 'Falcon', 'Finch', 'Flamingo', 'Goose', 'Hawk', 'Heron', 'Hummingbird', 'Ibis', 'Jay',
    'Kingfisher', 'Kiwi', 'Lark', 'Macaw', 'Magpie', 'Ostrich', 'Parrot', 'Peacock', 'Pelican', 'Pigeon',
    'Quail', 'Raven', 'Robin', 'Seagull', 'Sparrow', 'Stork', 'Swan', 'Toucan', 'Turkey', 'Vulture',
    'Woodpecker', 'Avocet', 'Blackbird', 'Cockatoo', 'Dodo', 'Egret', 'Flycatcher', 'Grouse', 'Hoopoe', 'Jackdaw',
    'Kestrel', 'Lorikeet', 'Mynah', 'Nightingale', 'Oriole', 'Parakeet', 'Quetzal', 'Roadrunner', 'Sandpiper', 'Thrush',
    'Umbrellabird', 'Vireo', 'Warbler', 'Xenops', 'Yellowhammer', 'Zebrafinch', 'Anhinga', 'Bittern', 'Cuckoo', 'Dunlin',
    'Eider', 'Fulmar', 'Godwit', 'Harrier', 'Jacana', 'Killdeer', 'Lapwing', 'Merlin', 'Nuthatch', 'Ovenbird',
    'Petrel', 'Quelea', 'Redstart', 'Skimmer', 'Tanager', 'Upupa', 'Veery', 'Whimbrel', 'Xenops', 'Yellowlegs',
    'Bulbul', 'Cassowary', 'Dickcissel', 'Echidna', 'Frigatebird', 'Gallinule', 'Hornbill', 'Iiwi', 'Junco', 'Kookaburra',
    'Loon', 'Motmot', 'Noddy', 'Osprey', 'Phainopepla', 'Quail', 'Redpoll', 'Siskin', 'Trogon', 'Verdin',
    'Wagtail', 'Wryneck', 'Yellowthroat', 'Zosterop', 'Bobolink', 'Cormorant', 'Dipper',

    // Marine Life (100)
    'Dolphin', 'Shark', 'Whale', 'Angelfish', 'Barracuda', 'Clownfish', 'Crab', 'Eel', 'Flounder', 'Grouper',
    'Jellyfish', 'Lobster', 'Mantaray', 'Narwhal', 'Octopus', 'Pufferfish', 'Salmon', 'Seahorse', 'Starfish', 'Stingray',
    'Swordfish', 'Tuna', 'Walrus', 'Anchovy', 'Blowfish', 'Coelacanth', 'Dugong', 'Emperor', 'Filefish', 'Goby',
    'Halibut', 'Icefish', 'Jawfish', 'Koi', 'Lionfish', 'Marlin', 'Needlefish', 'Oarfish', 'Parrotfish', 'Queenfish',
    'Remora', 'Sailfish', 'Triggerfish', 'Unicornfish', 'Viperfish', 'Wrasse', 'Yellowtail', 'Zebrafish', 'Anglerfish', 'Boxfish',
    'Cardinalfish', 'Damselfish', 'Escolar', 'Frogfish', 'Guitarfish', 'Hagfish', 'Imperator', 'Jackfish', 'Killifish', 'Lamprey',
    'Moonfish', 'Neonfish', 'Opah', 'Pompano', 'Quillfish', 'Rockfish', 'Scorpionfish', 'Tetra', 'Umbrellafish', 'Velvetfish',
    'Wolffish', 'Xiphias', 'Yellowfin', 'Zebrafin', 'Albacore', 'Bluegill', 'Catfish', 'Darter', 'Elver', 'Fangtooth',
    'Guppy', 'Herring', 'Ide', 'Jewelfish', 'Knifefish', 'Loach', 'Molly', 'Nase', 'Orbfish', 'Perch',
    'Roach', 'Snapper', 'Tilapia', 'Umbra', 'Vendace', 'Whiting', 'Xiph', 'Yellowtail', 'Zander',

    // Reptiles & Amphibians (75)
    'Alligator', 'Chameleon', 'Cobra', 'Crocodile', 'Frog', 'Gecko', 'Iguana', 'Lizard', 'Python', 'Salamander',
    'Snake', 'Terrapin', 'Toad', 'Tortoise', 'Turtle', 'Viper', 'Adder', 'Basilisk', 'Caiman', 'Dendrobate',
    'Eft', 'Firefly', 'Garter', 'Hellbender', 'Indigo', 'Javelin', 'Komodo', 'Leatherback', 'Mamba', 'Newt',
    'Olm', 'Pit', 'Quince', 'Rattler', 'Skink', 'Tuatara', 'Urutu', 'Varan', 'Woma', 'Xenopus',
    'Yarrow', 'Zebra', 'Asp', 'Boa', 'Copperhead', 'Dugite', 'Eyelash', 'Fer', 'Gila', 'Horned',
    'Iguana', 'Jacky', 'Krait', 'Loggerhead', 'Monitor', 'Natterjack', 'Ocellated', 'Puff', 'Queen', 'Racer',
    'Sidewinder', 'Taipan', 'Uromastyx', 'Vine', 'Water', 'Xenosaurus', 'Yellow', 'Zonure', 'Axolotl', 'Blindworm',
    'Cottonmouth', 'Dragon', 'Eft', 'Fire',

    // Insects & Arachnids (50)
    'Ant', 'Beetle', 'Butterfly', 'Cricket', 'Dragonfly', 'Firefly', 'Grasshopper', 'Ladybug', 'Mantis', 'Moth',
    'Scorpion', 'Spider', 'Wasp', 'Aphid', 'Bee', 'Caterpillar', 'Damselfly', 'Earwig', 'Flea', 'Glowworm',
    'Hornet', 'Inchworm', 'Junebug', 'Katydid', 'Lacewing', 'Mayfly', 'Nymph', 'Oakworm', 'Praying', 'Queenbee',
    'Roach', 'Silkworm', 'Termite', 'Underwing', 'Velvet', 'Walkingstick', 'Xerces', 'Yellow', 'Zebra', 'Assassin',
    'Borer', 'Cicada', 'Doodlebug', 'Emperor', 'Fritillary', 'Gnat', 'Harvester', 'Ichneumon', 'Jewel'
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