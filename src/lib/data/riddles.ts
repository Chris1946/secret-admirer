export interface Riddle {
	question: string;
	options: string[];
	correctIndex: number;
}

export const RIDDLES: Riddle[] = [
	{
		question: 'I have cities, but no houses. I have mountains, but no trees. What am I?',
		options: ['A globe', 'A map', 'A painting', 'A dream'],
		correctIndex: 1
	},
	{
		question: 'What has keys but no locks?',
		options: ['A treasure chest', 'A piano', 'A car', 'A phone'],
		correctIndex: 1
	},
	{
		question: 'What gets wetter the more it dries?',
		options: ['A sponge', 'A towel', 'Sand', 'A cloud'],
		correctIndex: 1
	},
	{
		question: "What has hands but can't clap?",
		options: ['A statue', 'A clock', 'A puppet', 'A robot'],
		correctIndex: 1
	},
	{
		question: 'What can travel around the world while staying in a corner?',
		options: ['The wind', 'A stamp', 'Wi-Fi', 'A thought'],
		correctIndex: 1
	},
	{
		question: 'What has a head and a tail but no body?',
		options: ['A snake', 'A coin', 'A pin', 'A worm'],
		correctIndex: 1
	},
	{
		question: 'I speak without a mouth and hear without ears. I have no body but I come alive with wind. What am I?',
		options: ['A ghost', 'A flag', 'An echo', 'Music'],
		correctIndex: 2
	},
	{
		question: "What has legs but doesn't walk?",
		options: ['A table', 'A spider', 'A chair', 'Both A and C'],
		correctIndex: 3
	},
	{
		question: 'What word becomes shorter when you add two letters to it?',
		options: ['Long', 'Short', 'Tall', 'Small'],
		correctIndex: 1
	},
	{
		question: 'What can fill a room but takes up no space?',
		options: ['Air', 'Sound', 'Light', 'Thoughts'],
		correctIndex: 2
	},
	{
		question: 'The more you take, the more you leave behind. What am I?',
		options: ['Memories', 'Footsteps', 'Breaths', 'Photos'],
		correctIndex: 1
	},
	{
		question: 'What invention lets you look right through a wall?',
		options: ['X-ray machine', 'A window', 'A camera', 'A telescope'],
		correctIndex: 1
	},
	{
		question: 'What begins with T, ends with T, and has T in it?',
		options: ['Toast', 'A teapot', 'A tent', 'A test'],
		correctIndex: 1
	},
	{
		question: 'What goes up but never comes back down?',
		options: ['A balloon', 'Your age', 'A rocket', 'Smoke'],
		correctIndex: 1
	},
	{
		question: "What has one eye but can't see?",
		options: ['A pirate', 'A needle', 'A cyclops', 'A camera'],
		correctIndex: 1
	},
	{
		question: "What is always in front of you but can't be seen?",
		options: ['Your nose', 'The future', 'Air', 'Darkness'],
		correctIndex: 1
	},
	{
		question: 'What is so fragile that saying its name breaks it?',
		options: ['Glass', 'A promise', 'Silence', 'Trust'],
		correctIndex: 2
	},
	{
		question: 'What month has 28 days?',
		options: ['February', 'All of them', 'None', 'Only leap years'],
		correctIndex: 1
	},
	{
		question: 'What can you catch but not throw?',
		options: ['A ball', 'A cold', 'A fish', 'A wave'],
		correctIndex: 1
	},
	{
		question: 'What kind of band never plays music?',
		options: ['A rock band', 'A rubber band', 'A marching band', 'A boy band'],
		correctIndex: 1
	},
	{
		question: "I'm tall when I'm young and short when I'm old. What am I?",
		options: ['A tree', 'A candle', 'A person', 'A pencil'],
		correctIndex: 1
	},
	{
		question: 'What tastes better than it smells?',
		options: ['Chocolate', 'A tongue', 'Coffee', 'Perfume'],
		correctIndex: 1
	},
	{
		question: 'What has words but never speaks?',
		options: ['A mime', 'A book', 'A sign', 'A painting'],
		correctIndex: 1
	},
	{
		question: 'What has a neck but no head?',
		options: ['A giraffe', 'A bottle', 'A guitar', 'A shirt'],
		correctIndex: 1
	},
	{
		question: 'What can you break even if you never touch it?',
		options: ['A heart', 'A promise', 'A record', 'All of these'],
		correctIndex: 3
	},
	{
		question: 'What goes through towns and over hills but never moves?',
		options: ['A car', 'A road', 'The sun', 'Wind'],
		correctIndex: 1
	},
	{
		question: "If you drop me, I'm sure to crack. Give me a smile and I'll always smile back. What am I?",
		options: ['An egg', 'A mirror', 'A phone', 'A plate'],
		correctIndex: 1
	},
	{
		question: 'Where does Friday come before Thursday?',
		options: ['Nowhere', 'In the dictionary', 'In Australia', 'On a calendar'],
		correctIndex: 1
	},
	{
		question: 'What building has the most stories?',
		options: ['A skyscraper', 'A library', 'A palace', 'A school'],
		correctIndex: 1
	},
	{
		question: 'What is full of holes but still holds water?',
		options: ['A net', 'A sponge', 'A bucket', 'A cloud'],
		correctIndex: 1
	},
	{
		question: "I have branches, but no fruit, trunk, or leaves. What am I?",
		options: ['A river', 'A bank', 'A coral', 'Lightning'],
		correctIndex: 1
	},
	{
		question: 'What runs all around a yard without moving?',
		options: ['A dog', 'A fence', 'Water', 'Wind'],
		correctIndex: 1
	},
	{
		question: "What has teeth but can't bite?",
		options: ['A shark', 'A comb', 'A saw', 'A zipper'],
		correctIndex: 1
	},
	{
		question: 'What can you keep after giving it to someone?',
		options: ['A gift', 'Your word', 'A hug', 'Money'],
		correctIndex: 1
	},
	{
		question: "I'm found in socks, scarves, and mittens. I'm found in kittens. What am I?",
		options: ['Fur', 'Warmth', 'Yarn', 'Cotton'],
		correctIndex: 2
	},
	{
		question: 'What has four wheels and flies?',
		options: ['A helicopter', 'A garbage truck', 'A drone', 'A flying car'],
		correctIndex: 1
	},
	{
		question: 'What two things can you never eat for breakfast?',
		options: ['Pizza and burgers', 'Lunch and dinner', 'Eggs and toast', 'Cake and ice cream'],
		correctIndex: 1
	},
	{
		question: 'What word is always spelled incorrectly?',
		options: ['Incorrectly', 'Mississippi', 'Necessary', 'Accommodate'],
		correctIndex: 0
	},
	{
		question: "If two's company and three's a crowd, what are four and five?",
		options: ['A party', 'Nine', 'A group', 'Too many'],
		correctIndex: 1
	},
	{
		question: 'What do you call a bear with no teeth?',
		options: ['A teddy bear', 'A gummy bear', 'A bald bear', 'A baby bear'],
		correctIndex: 1
	}
];
