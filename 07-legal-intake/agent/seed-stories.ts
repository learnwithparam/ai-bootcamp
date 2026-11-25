// The requests the seed sends through the real graph, written as clients write them.
// They cover the hard cases a firm meets: an urgent date, an exact and a possible conflict,
// a family matter the firm does not handle (the possible conflict is Greenhill Property, close to a client's name), and a client who writes in Portuguese.

export type Stage = "review" | "letter" | "answered" | "declined";
export type SeedStory = {
  name: string;
  others: string[];
  goal: string;
  story: string;
  stage: Stage;
  quote?: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// A date a few days from the day the seed runs, so the board always has something urgent.
function soon(days: number) {
  const date = new Date(Date.now() + days * 86_400_000);
  return {
    iso: date.toISOString().slice(0, 10),
    words: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
  };
}

const urgent = soon(4);

export const STORIES: SeedStory[] = [
  {
    name: "Ana Silva",
    others: ["Greenway Homes"],
    goal: "Get my 900 pound deposit back",
    story:
      "I rented a flat from Greenway Homes for two years. When I moved out they kept my whole deposit of 900 pounds and say the carpets were damaged, but they were already worn and I have photos from the day I moved in.",
    stage: "answered",
  },
  {
    name: "Kwame Asante",
    others: ["Riverside Couriers Ltd"],
    goal: "Be paid the wages I am owed",
    story: `Riverside Couriers Ltd has not paid me for my last six weeks of work, about 2,400 pounds. My manager says it is a cash flow problem. I have to tell them if I am taking it further by ${urgent.words}.`,
    stage: "review",
    quote: `by ${urgent.words}`,
  },
  {
    name: "Priya Shah",
    others: ["Aurora Dental Group"],
    goal: "Challenge my dismissal",
    story:
      "I worked as a dental nurse at Aurora Dental Group for four years. Last month they dismissed me with one day of notice after I raised a complaint about unpaid overtime. Nobody gave me a reason in writing.",
    stage: "review",
  },
  {
    name: "Tom Reyes",
    others: ["Greenway Homes"],
    goal: "Get the leak repaired",
    story:
      "My landlord Greenway Homes has not fixed a leak in my bedroom ceiling for four months. The letting agent, Marcus Bell, told me in writing that repairs are my problem and I should stop complaining. There is mould on the wall now.",
    stage: "review",
  },
  {
    name: "Hannah Okafor",
    others: ["Brightline Telecom Services"],
    goal: "Leave the contract without paying the fee",
    story:
      "Brightline Telecom Services sold me a broadband contract on the phone and promised 500 Mbps. I get 40 on a good day. They want 380 pounds to let me leave early. I have their sales email with the promise in it.",
    stage: "review",
  },
  {
    name: "Joana Ferreira",
    others: ["Casa Nova Imóveis"],
    goal: "Recuperar a caução",
    story:
      "Aluguei um apartamento à Casa Nova Imóveis durante três anos. Saí em outubro e até hoje não me devolveram a caução de 1.200 euros. Dizem que a pintura estava estragada, mas tenho fotografias de quando entrei.",
    stage: "review",
  },
  {
    name: "Daniel Price",
    others: ["Laura Price"],
    goal: "Agree when I see my children",
    story:
      "My wife Laura Price and I separated in the summer. She will not let me see our two children at weekends any more and stopped answering my messages. I want an arrangement that is fair to the kids.",
    stage: "declined",
  },
  {
    name: "Mei Lin",
    others: ["Quayside Fitness Ltd"],
    goal: "Stop the payments and get a refund",
    story:
      "I cancelled my gym membership with Quayside Fitness Ltd in August, in writing, with the 30 days notice the contract asks for. They have taken 45 pounds every month since and say they never got the letter.",
    stage: "letter",
  },
  {
    name: "Oliver Grant",
    others: ["Northgate Cars"],
    goal: "Return the car for a full refund",
    story:
      "I bought a used car from Northgate Cars three weeks ago for 6,500 pounds. The gearbox failed on day nine. They offered a repair but the garage I asked says it will fail again. I want to give it back.",
    stage: "answered",
  },
  {
    name: "Sara Novak",
    others: ["Greenhill Property", "Mark Ellis"],
    goal: "Stay in my home until the end of the tenancy",
    story:
      "Greenhill Property, the letting agent, and the owner, Mark Ellis, gave me a notice to leave by 28 February 2027, but my fixed term runs until June. They changed the locks on the shared shed already. I do not want to lose my home.",
    stage: "review",
    quote: "leave by 28 February 2027",
  },
  {
    name: "Ravi Menon",
    others: ["Bluepeak Software Ltd"],
    goal: "A fair settlement for my redundancy",
    story:
      "Bluepeak Software Ltd made me redundant after eight years, but they hired someone into the same job two weeks later under a new title. They offered statutory pay only and want me to sign by 15 January 2027.",
    stage: "review",
    quote: "sign by 15 January 2027",
  },
  {
    name: "Grace Byrne",
    others: ["Sunrise Kitchens"],
    goal: "Get the kitchen finished or my money back",
    story:
      "I paid Sunrise Kitchens a 4,000 pound deposit in June for a new kitchen. The fitters left half the units unfinished in September and nobody answers the phone. I have the contract and the bank transfer.",
    stage: "review",
  },
];
