import { MongoClient } from 'mongodb';

// Connection URL - use the same as in the sample file
const url = process.env.MONGO_URL || "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "inseat";

// Categories data based on categories-data.json
const categoriesData = [
  {
    "id": "promotions",
    "name": "PROMOTIONS",
    "image": "https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg",
    "imageSearchTerm": "restaurant promotion deal",
    "subCategories": ["Daily Deals", "Happy Hour", "Combo Offers", "Special Events"]
  },
  {
    "id": "food",
    "name": "FOOD",
    "image": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
    "imageSearchTerm": "gourmet food platter",
    "subCategories": [
      "NOODLES",
      "FRIED SIDES",
      "SALADS",
      "SUSHI PLATTERS",
      "SUSHI ROLLS",
      "SLIDERS, BURGERS & SANDWICHES",
      "HOTDOGS",
      "MEXICAN TREAT",
      "DESSERTS"
    ]
  },
  {
    "id": "cinema_snacks",
    "name": "CINEMA SNACKS",
    "image": "https://images.pexels.com/photos/614117/pexels-photo-614117.jpeg",
    "imageSearchTerm": "cinema snacks popcorn nachos",
    "subCategories": ["Popcorn", "Nachos", "Candy", "Pretzels", "Soft Drinks"]
  },
  {
    "id": "mocktails",
    "name": "MOCKTAILS & FIZZ DRINKS",
    "image": "https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg",
    "imageSearchTerm": "colorful mocktails bar",
    "subCategories": ["Virgin Cocktails", "Smoothies", "Shakes", "Sparkling Drinks"]
  },
  {
    "id": "beers",
    "name": "BEERS",
    "image": "https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg",
    "imageSearchTerm": "craft beer selection",
    "subCategories": ["Draft Beers", "Bottled Beers", "Craft Beers", "Import Beers"]
  },
  {
    "id": "drinks",
    "name": "DRINKS",
    "image": "https://images.pexels.com/photos/3020919/pexels-photo-3020919.jpeg",
    "imageSearchTerm": "refreshing drinks variety",
    "subCategories": ["Coffee", "Tea", "Juices", "Soft Drinks", "Energy Drinks"]
  },
  {
    "id": "cocktails",
    "name": "COCKTAILS & ALCOHOLIC BEVERAGES",
    "image": "https://images.pexels.com/photos/1170598/pexels-photo-1170598.jpeg",
    "imageSearchTerm": "classic cocktails bar setting",
    "subCategories": ["Signature Cocktails", "Classic Cocktails", "Spirits", "Liqueurs"]
  },
  {
    "id": "wine",
    "name": "WINE LIST",
    "image": "https://images.pexels.com/photos/3019019/pexels-photo-3019019.jpeg",
    "imageSearchTerm": "wine bottles cellar",
    "subCategories": ["Red Wine", "White Wine", "Rosé", "Sparkling Wine", "Champagne"]
  }
];

// Sample menu items for each subcategory
const generateMenuItems = (categoryId, subcategoryId, subcategoryName, restaurantId) => {
  const items = [];
  
  // Generate 3-5 items for each subcategory
  const numItems = Math.floor(Math.random() * 3) + 3; // 3-5 items
  
  for (let i = 1; i <= numItems; i++) {
    let name, description, price, image;
    
    // Food category
    if (categoryId === "food") {
      if (subcategoryName === "NOODLES") {
        const noodleTypes = ["Ramen", "Pad Thai", "Spaghetti", "Udon", "Pho", "Lo Mein"];
        name = `${noodleTypes[Math.floor(Math.random() * noodleTypes.length)]} #${i}`;
        description = `Delicious ${name.toLowerCase()} with fresh ingredients and special sauce.`;
        price = 8.99 + (Math.random() * 6).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg";
      } 
      else if (subcategoryName === "FRIED SIDES") {
        const sideTypes = ["French Fries", "Onion Rings", "Mozzarella Sticks", "Chicken Wings", "Calamari"];
        name = `${sideTypes[Math.floor(Math.random() * sideTypes.length)]} #${i}`;
        description = `Crispy fried ${name.toLowerCase()} served with dipping sauce.`;
        price = 4.99 + (Math.random() * 3).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg";
      }
      else if (subcategoryName === "SALADS") {
        const saladTypes = ["Caesar", "Greek", "Cobb", "Garden", "Caprese"];
        name = `${saladTypes[Math.floor(Math.random() * saladTypes.length)]} Salad #${i}`;
        description = `Fresh ${name.toLowerCase()} with homemade dressing.`;
        price = 7.99 + (Math.random() * 4).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1152237/pexels-photo-1152237.jpeg";
      }
      else if (subcategoryName.includes("SUSHI")) {
        const sushiTypes = ["California Roll", "Dragon Roll", "Spicy Tuna", "Rainbow Roll", "Salmon Nigiri"];
        name = `${sushiTypes[Math.floor(Math.random() * sushiTypes.length)]} #${i}`;
        description = `Fresh ${name.toLowerCase()} made with premium ingredients.`;
        price = 10.99 + (Math.random() * 8).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg";
      }
      else if (subcategoryName.includes("SLIDERS")) {
        const burgerTypes = ["Beef", "Chicken", "Veggie", "BBQ", "Cheese"];
        name = `${burgerTypes[Math.floor(Math.random() * burgerTypes.length)]} Burger #${i}`;
        description = `Juicy ${name.toLowerCase()} with all the fixings.`;
        price = 9.99 + (Math.random() * 5).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg";
      }
      else if (subcategoryName === "HOTDOGS") {
        const hotdogTypes = ["Classic", "Chili Cheese", "Chicago Style", "New York", "Bacon Wrapped"];
        name = `${hotdogTypes[Math.floor(Math.random() * hotdogTypes.length)]} Hot Dog #${i}`;
        description = `Delicious ${name.toLowerCase()} served with your choice of toppings.`;
        price = 6.99 + (Math.random() * 3).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/5718025/pexels-photo-5718025.jpeg";
      }
      else if (subcategoryName === "MEXICAN TREAT") {
        const mexicanTypes = ["Tacos", "Burritos", "Quesadillas", "Nachos", "Enchiladas"];
        name = `${mexicanTypes[Math.floor(Math.random() * mexicanTypes.length)]} #${i}`;
        description = `Authentic ${name.toLowerCase()} made with traditional recipes.`;
        price = 8.99 + (Math.random() * 5).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/2092507/pexels-photo-2092507.jpeg";
      }
      else if (subcategoryName === "DESSERTS") {
        const dessertTypes = ["Chocolate Cake", "Cheesecake", "Ice Cream", "Tiramisu", "Apple Pie"];
        name = `${dessertTypes[Math.floor(Math.random() * dessertTypes.length)]} #${i}`;
        description = `Decadent ${name.toLowerCase()} to satisfy your sweet tooth.`;
        price = 5.99 + (Math.random() * 4).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg";
      }
      else {
        name = `Food Item #${i}`;
        description = `Delicious food item for your enjoyment.`;
        price = 9.99 + (Math.random() * 5).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg";
      }
    }
    // Cinema Snacks category
    else if (categoryId === "cinema_snacks") {
      if (subcategoryName === "Popcorn") {
        const sizes = ["Small", "Medium", "Large", "Extra Large"];
        const flavors = ["Butter", "Caramel", "Cheese", "Plain", "Sweet & Salty"];
        name = `${sizes[Math.floor(Math.random() * sizes.length)]} ${flavors[Math.floor(Math.random() * flavors.length)]} Popcorn`;
        description = `Fresh popped ${name.toLowerCase()} - the perfect movie companion.`;
        price = 3.99 + (Math.random() * 4).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/33129/popcorn-movie-party-entertainment.jpg";
      }
      else if (subcategoryName === "Nachos") {
        const types = ["Classic", "Loaded", "Cheese", "BBQ", "Spicy"];
        name = `${types[Math.floor(Math.random() * types.length)]} Nachos`;
        description = `Crispy corn chips with ${name.toLowerCase().replace('nachos', '')} toppings.`;
        price = 5.99 + (Math.random() * 3).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1108775/pexels-photo-1108775.jpeg";
      }
      else if (subcategoryName === "Candy") {
        const candyTypes = ["Chocolate Bar", "Gummy Bears", "Licorice", "Sour Candy", "Mixed Candy"];
        name = `${candyTypes[Math.floor(Math.random() * candyTypes.length)]}`;
        description = `Sweet treats to enjoy during your movie.`;
        price = 2.99 + (Math.random() * 2).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/55825/gold-bear-gummi-bears-bear-yellow-55825.jpeg";
      }
      else if (subcategoryName === "Pretzels") {
        const types = ["Salted", "Cheese Filled", "Cinnamon Sugar", "Garlic", "Plain"];
        name = `${types[Math.floor(Math.random() * types.length)]} Pretzel`;
        description = `Warm ${name.toLowerCase()} baked to perfection.`;
        price = 3.99 + (Math.random() * 2).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/5967008/pexels-photo-5967008.jpeg";
      }
      else if (subcategoryName === "Soft Drinks") {
        const drinks = ["Cola", "Lemon-Lime Soda", "Root Beer", "Orange Soda", "Iced Tea"];
        const sizes = ["Small", "Medium", "Large"];
        name = `${sizes[Math.floor(Math.random() * sizes.length)]} ${drinks[Math.floor(Math.random() * drinks.length)]}`;
        description = `Refreshing ${name.toLowerCase()} to quench your thirst.`;
        price = 2.99 + (Math.random() * 2).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/2983100/pexels-photo-2983100.jpeg";
      }
      else {
        name = `Cinema Snack #${i}`;
        description = `Delicious movie theater treat.`;
        price = 4.99 + (Math.random() * 3).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/614117/pexels-photo-614117.jpeg";
      }
    }
    // Cocktails category
    else if (categoryId === "cocktails") {
      if (subcategoryName === "Signature Cocktails") {
        const names = ["House Special", "The Showstopper", "Cinema Sunset", "Director's Cut", "Movie Magic"];
        name = `${names[Math.floor(Math.random() * names.length)]} #${i}`;
        description = `Our signature cocktail made with premium spirits and fresh ingredients.`;
        price = 10.99 + (Math.random() * 4).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg";
      }
      else if (subcategoryName === "Classic Cocktails") {
        const classics = ["Margarita", "Mojito", "Old Fashioned", "Moscow Mule", "Negroni", "Martini"];
        name = `${classics[Math.floor(Math.random() * classics.length)]} #${i}`;
        description = `Classic ${name.toLowerCase()} mixed to perfection.`;
        price = 9.99 + (Math.random() * 3).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1170599/pexels-photo-1170599.jpeg";
      }
      else if (subcategoryName === "Spirits") {
        const spirits = ["Whiskey", "Vodka", "Gin", "Rum", "Tequila"];
        const brands = ["Premium", "House", "Special Reserve", "Small Batch"];
        name = `${brands[Math.floor(Math.random() * brands.length)]} ${spirits[Math.floor(Math.random() * spirits.length)]} #${i}`;
        description = `Fine ${name.toLowerCase()} served neat or on the rocks.`;
        price = 7.99 + (Math.random() * 7).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/339696/pexels-photo-339696.jpeg";
      }
      else if (subcategoryName === "Liqueurs") {
        const liqueurs = ["Coffee Liqueur", "Orange Liqueur", "Amaretto", "Irish Cream", "Fruit Liqueur"];
        name = `${liqueurs[Math.floor(Math.random() * liqueurs.length)]} #${i}`;
        description = `Smooth and flavorful ${name.toLowerCase()}.`;
        price = 6.99 + (Math.random() * 4).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/209590/pexels-photo-209590.jpeg";
      }
      else {
        name = `Cocktail #${i}`;
        description = `A delicious mixed drink to enjoy with your movie.`;
        price = 9.99 + (Math.random() * 4).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1170598/pexels-photo-1170598.jpeg";
      }
    }
    // Wine category
    else if (categoryId === "wine") {
      const wineTypes = {
        "Red Wine": ["Cabernet Sauvignon", "Merlot", "Pinot Noir", "Syrah", "Malbec"],
        "White Wine": ["Chardonnay", "Sauvignon Blanc", "Pinot Grigio", "Riesling", "Moscato"],
        "Rosé": ["Provence Rosé", "White Zinfandel", "Rosé Blend", "Sparkling Rosé", "Dry Rosé"],
        "Sparkling Wine": ["Prosecco", "Cava", "Sparkling Brut", "Sparkling Rosé", "Moscato d'Asti"],
        "Champagne": ["Brut", "Extra Brut", "Demi-Sec", "Rosé Champagne", "Vintage Champagne"]
      };
      
      const wines = wineTypes[subcategoryName] || ["House Wine", "Special Reserve", "Vineyard Select", "Vintage Selection", "Winemaker's Choice"];
      const years = [2015, 2016, 2017, 2018, 2019, 2020];
      const wineName = wines[Math.floor(Math.random() * wines.length)];
      const year = years[Math.floor(Math.random() * years.length)];
      
      name = `${wineName} ${year} #${i}`;
      description = `${subcategoryName} - ${wineName} from ${year}. A delightful wine with complex flavors.`;
      price = 8.99 + (Math.random() * 12).toFixed(2) * 1;
      image = "https://images.pexels.com/photos/2912108/pexels-photo-2912108.jpeg";
      
      if (subcategoryName === "Champagne") {
        image = "https://images.pexels.com/photos/2795030/pexels-photo-2795030.jpeg";
        price = 24.99 + (Math.random() * 25).toFixed(2) * 1;
      } else if (subcategoryName === "Sparkling Wine") {
        image = "https://images.pexels.com/photos/2697319/pexels-photo-2697319.jpeg";
        price = 14.99 + (Math.random() * 15).toFixed(2) * 1;
      }
    }
    // Beers category
    else if (categoryId === "beers") {
      const beerTypes = {
        "Draft Beers": ["Lager", "Pale Ale", "IPA", "Stout", "Wheat Beer"],
        "Bottled Beers": ["Pilsner", "Amber Ale", "Brown Ale", "Porter", "Light Beer"],
        "Craft Beers": ["Double IPA", "Sour Ale", "Saison", "Belgian Tripel", "Imperial Stout"],
        "Import Beers": ["German", "Belgian", "Japanese", "Mexican", "Irish"]
      };
      
      const beers = beerTypes[subcategoryName] || ["House Beer", "Special Brew", "Cinema Ale", "Movie Lager", "Director's Beer"];
      const beerName = beers[Math.floor(Math.random() * beers.length)];
      
      name = `${beerName} Beer #${i}`;
      description = `${subcategoryName} - ${beerName}. A refreshing beer with perfect balance.`;
      price = 5.99 + (Math.random() * 4).toFixed(2) * 1;
      image = "https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg";
    }
    // Mocktails category
    else if (categoryId === "mocktails") {
      const mocktailTypes = {
        "Virgin Cocktails": ["Virgin Mojito", "Alcohol-Free Piña Colada", "Virgin Mary", "Shirley Temple", "Mock Margarita"],
        "Smoothies": ["Berry Blast", "Tropical Paradise", "Green Detox", "Banana Split", "Mango Tango"],
        "Shakes": ["Chocolate", "Vanilla", "Strawberry", "Cookies & Cream", "Caramel"],
        "Sparkling Drinks": ["Sparkling Lemonade", "Club Soda with Lime", "Italian Soda", "Sparkling Berry", "Ginger Fizz"]
      };
      
      const drinks = mocktailTypes[subcategoryName] || ["House Special", "Refresher", "Fruity Blend", "Cinema Sparkler", "Movie Magic"];
      const drinkName = drinks[Math.floor(Math.random() * drinks.length)];
      
      name = `${drinkName} #${i}`;
      description = `${subcategoryName} - ${drinkName}. A delightful non-alcoholic beverage.`;
      price = 5.99 + (Math.random() * 3).toFixed(2) * 1;
      image = "https://images.pexels.com/photos/1194030/pexels-photo-1194030.jpeg";
    }
    // Drinks category
    else if (categoryId === "drinks") {
      const drinkTypes = {
        "Coffee": ["Espresso", "Latte", "Cappuccino", "Americano", "Mocha"],
        "Tea": ["Earl Grey", "Green Tea", "Chai", "Herbal Tea", "English Breakfast"],
        "Juices": ["Orange", "Apple", "Cranberry", "Pineapple", "Mixed Fruit"],
        "Soft Drinks": ["Cola", "Lemon-Lime", "Root Beer", "Orange Soda", "Cream Soda"],
        "Energy Drinks": ["Classic Energy", "Sugar-Free Energy", "Citrus Energy", "Berry Energy", "Tropical Energy"]
      };
      
      const drinks = drinkTypes[subcategoryName] || ["House Special", "Refresher", "Signature Drink", "Cinema Classic", "Movie Magic"];
      const drinkName = drinks[Math.floor(Math.random() * drinks.length)];
      
      name = `${drinkName} #${i}`;
      description = `${subcategoryName} - ${drinkName}. A refreshing beverage to enjoy with your movie.`;
      price = 3.99 + (Math.random() * 2).toFixed(2) * 1;
      image = "https://images.pexels.com/photos/3020919/pexels-photo-3020919.jpeg";
    }
    // Promotions category
    else if (categoryId === "promotions") {
      if (subcategoryName === "Daily Deals") {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        name = `${days[Math.floor(Math.random() * days.length)]} Special #${i}`;
        description = `Special deal available every ${name.split(' ')[0]}.`;
        price = 12.99 + (Math.random() * 7).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg";
      }
      else if (subcategoryName === "Happy Hour") {
        name = `Happy Hour Special #${i}`;
        description = `Available during Happy Hour (4-7pm daily).`;
        price = 7.99 + (Math.random() * 4).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/696218/pexels-photo-696218.jpeg";
      }
      else if (subcategoryName === "Combo Offers") {
        name = `Combo #${i}`;
        description = `Get more value with this combo deal.`;
        price = 14.99 + (Math.random() * 10).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1653877/pexels-photo-1653877.jpeg";
      }
      else if (subcategoryName === "Special Events") {
        const events = ["Premiere Night", "Oscar Night", "Ladies Night", "Family Sunday", "Date Night"];
        name = `${events[Math.floor(Math.random() * events.length)]} Special #${i}`;
        description = `Special offer during ${name.replace(' Special #' + i, '')}.`;
        price = 19.99 + (Math.random() * 10).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg";
      }
      else {
        name = `Promotion #${i}`;
        description = `Limited-time special offer.`;
        price = 9.99 + (Math.random() * 5).toFixed(2) * 1;
        image = "https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg";
      }
    }
    // Default for any other category
    else {
      name = `Menu Item #${i}`;
      description = `Delicious item from the ${subcategoryName} section.`;
      price = 7.99 + (Math.random() * 7).toFixed(2) * 1;
      image = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg";
    }
    
    items.push({
      name,
      description,
      price,
      image,
      categoryId,
      subcategoryId,
      restaurantId,
      available: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return items;
};

async function main() {
  console.log('Starting menu data seeding...');
  
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db(dbName);
    
    // Get a reference to collections
    const categoriesCollection = db.collection('categories');
    const subcategoriesCollection = db.collection('subcategories');
    const menuItemsCollection = db.collection('menuitems');
    const restaurantsCollection = db.collection('restaurants');
    
    // Get a sample restaurant to assign menu items to
    let restaurant = await restaurantsCollection.findOne({});
    
    // If no restaurant exists, create one
    if (!restaurant) {
      console.log('No restaurant found in the database. Creating a sample restaurant...');
      
      const restaurantDoc = {
        name: "InSeat Cinema & Dining",
        description: "A premium cinema and dining experience",
        address: "123 Movie Lane, Entertainment District",
        phone: "+1 (555) 123-4567",
        email: "contact@inseatcinema.com",
        website: "https://inseatcinema.com",
        image: "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await restaurantsCollection.insertOne(restaurantDoc);
      restaurant = {
        ...restaurantDoc,
        _id: result.insertedId
      };
      console.log(`Created sample restaurant with ID: ${result.insertedId}`);
    }
    
    console.log(`Using restaurant: ${restaurant.name} (${restaurant._id})`);
    
    // Create categories
    console.log('\n--- Creating categories ---');
    for (const category of categoriesData) {
      // Check if category already exists
      const existingCategory = await categoriesCollection.findOne({ name: category.name });
      
      if (existingCategory) {
        console.log(`Category ${category.name} already exists with ID: ${existingCategory._id}`);
        continue;
      }
      
      const categoryDoc = {
        name: category.name,
        description: `${category.name} category`,
        image: category.image,
        restaurantId: restaurant._id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await categoriesCollection.insertOne(categoryDoc);
      console.log(`Created category ${category.name} with ID: ${result.insertedId}`);
      
      // Create subcategories for this category
      console.log(`\n--- Creating subcategories for ${category.name} ---`);
      for (const subcategoryName of category.subCategories) {
        // Check if subcategory already exists
        const existingSubcategory = await subcategoriesCollection.findOne({ 
          name: subcategoryName,
          categoryId: result.insertedId
        });
        
        if (existingSubcategory) {
          console.log(`Subcategory ${subcategoryName} already exists with ID: ${existingSubcategory._id}`);
          continue;
        }
        
        const subcategoryDoc = {
          name: subcategoryName,
          description: `${subcategoryName} subcategory`,
          categoryId: result.insertedId,
          restaurantId: restaurant._id,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const subcategoryResult = await subcategoriesCollection.insertOne(subcategoryDoc);
        console.log(`Created subcategory ${subcategoryName} with ID: ${subcategoryResult.insertedId}`);
        
        // Generate and create menu items for this subcategory
        const menuItems = generateMenuItems(category.id, subcategoryResult.insertedId, subcategoryName, restaurant._id);
        
        if (menuItems.length > 0) {
          const menuItemsResult = await menuItemsCollection.insertMany(menuItems);
          console.log(`Created ${menuItemsResult.insertedCount} menu items for subcategory ${subcategoryName}`);
        }
      }
    }
    
    // Get counts of all documents created
    const categoryCount = await categoriesCollection.countDocuments();
    const subcategoryCount = await subcategoriesCollection.countDocuments();
    const menuItemCount = await menuItemsCollection.countDocuments();
    
    console.log('\n--- Seeding complete ---');
    console.log(`Total categories: ${categoryCount}`);
    console.log(`Total subcategories: ${subcategoryCount}`);
    console.log(`Total menu items: ${menuItemCount}`);
    
  } catch (error) {
    console.error('Error during menu data seeding:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

export { main };

main().catch(console.error); 