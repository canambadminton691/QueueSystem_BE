const animals = [
    // Mammals - Land
    'Panda', 'Tiger', 'Lion', 'Elephant', 'Giraffe', 'Kangaroo', 'Koala', 'Zebra', 'Bear', 'Wolf', 
    'Fox', 'Deer', 'Rabbit', 'Monkey', 'Gorilla', 'Cheetah', 'Leopard', 'Hippo', 'Rhino', 'Raccoon',
    // 为简洁起见，这里只列出一部分，实际使用中应包含更多动物名称
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