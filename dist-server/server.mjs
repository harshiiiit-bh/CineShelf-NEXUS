// server.ts
import "dotenv/config";
import http from "http";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Type } from "@google/genai";

// src/data/localMovies.json
var localMovies_default = [
  {
    movieId: "arch-uri-2019",
    wikidataId: "Q55636808",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Uri: The Surgical Strike",
    originalTitle: "\u0909\u0930\u0940: \u0926 \u0938\u0930\u094D\u091C\u093F\u0915\u0932 \u0938\u094D\u091F\u094D\u0930\u093E\u0907\u0915",
    contentType: "movie",
    releaseYear: 2019,
    language: "Hindi",
    country: "India",
    director: "Aditya Dhar",
    productionInfo: "RSVP Movies",
    ageRating: "UA",
    cast: ["Vicky Kaushal", "Paresh Rawal", "Yami Gautam", "Mohit Raina"],
    genres: ["Action", "War", "Drama", "Thriller"],
    tags: ["military", "surgical-strike", "patriotic", "tactical", "special-forces", "true-events"],
    categories: ["featured", "indian_military", "action_thrillers"],
    runtimeMinutes: 138,
    communityRating: 8.2,
    popularityScore: 96,
    overview: "Indian army special forces execute a covert surgical operation across the Line of Control following a deadly militant attack in Uri, Kashmir.",
    posterUrl: "",
    backdropUrl: "",
    trailerYoutubeUrl: "https://www.youtube.com/watch?v=Cg8sbRFS3zU",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-02-15T10:00:00.000Z"
  },
  {
    movieId: "arch-shershaah-2021",
    wikidataId: "Q65066202",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Shershaah",
    originalTitle: "\u0936\u0947\u0930\u0936\u093E\u0939",
    contentType: "movie",
    releaseYear: 2021,
    language: "Hindi",
    country: "India",
    director: "Vishnuvardhan",
    productionInfo: "Dharma Productions \u2022 Kaash Entertainment",
    ageRating: "UA",
    cast: ["Sidharth Malhotra", "Kiara Advani", "Shiv Panditt"],
    genres: ["War", "Biography", "Action", "Drama"],
    tags: ["military", "kargil-war", "patriotic", "biopic", "valor", "true-events"],
    categories: ["featured", "indian_military", "biographical_cinema"],
    runtimeMinutes: 135,
    communityRating: 8.3,
    popularityScore: 94,
    overview: "The life and valor of PVC awardee Captain Vikram Batra during the 1999 Kargil War in the high-altitude peaks of Kashmir.",
    posterUrl: "",
    backdropUrl: "",
    trailerYoutubeUrl: "https://www.youtube.com/watch?v=Q0FTXnefVBA",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-02-14T09:00:00.000Z"
  },
  {
    movieId: "arch-pippa-2023",
    wikidataId: "Q114345175",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Pippa",
    originalTitle: "\u092A\u093F\u092A\u094D\u092A\u093E",
    contentType: "movie",
    releaseYear: 2023,
    language: "Hindi",
    country: "India",
    director: "Raja Krishna Menon",
    productionInfo: "RSVP Movies \u2022 Roy Kapur Films",
    ageRating: "UA",
    cast: ["Ishaan Khatter", "Mrunal Thakur", "Priyanshu Painyuli"],
    genres: ["War", "History", "Action", "Drama"],
    tags: ["military", "1971-war", "tank-warfare", "patriotic", "true-events"],
    categories: ["indian_military", "historical_drama"],
    runtimeMinutes: 139,
    communityRating: 7.4,
    popularityScore: 85,
    overview: "Captain Balram Singh Mehta of India's 45 Cavalry regiment fights on the eastern front during the Indo-Pakistani War of 1971 aboard the amphibious PT-76 tank.",
    posterUrl: "",
    backdropUrl: "",
    trailerYoutubeUrl: "https://www.youtube.com/watch?v=fb5ELWi-ekk",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-01-20T12:00:00.000Z"
  },
  {
    movieId: "arch-sam-bahadur-2023",
    wikidataId: "Q115804215",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Sam Bahadur",
    originalTitle: "\u0938\u0948\u092E \u092C\u0939\u093E\u0926\u0941\u0930",
    contentType: "movie",
    releaseYear: 2023,
    language: "Hindi",
    country: "India",
    director: "Meghna Gulzar",
    productionInfo: "RSVP Movies",
    ageRating: "UA",
    cast: ["Vicky Kaushal", "Sanya Malhotra", "Fatima Sana Shaikh"],
    genres: ["Biography", "War", "History", "Drama"],
    tags: ["military", "field-marshal", "1971-war", "patriotic", "biopic", "leadership"],
    categories: ["featured", "indian_military", "biographical_cinema"],
    runtimeMinutes: 150,
    communityRating: 8,
    popularityScore: 91,
    overview: "A biographical portrait of India's first Field Marshal, Sam Manekshaw, spanning four decades and five wars culminating in the 1971 liberation campaign.",
    posterUrl: "",
    backdropUrl: "",
    trailerYoutubeUrl: "https://www.youtube.com/watch?v=6xJ7wB_yG7Y",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-02-18T11:30:00.000Z"
  },
  {
    movieId: "arch-border-1997",
    wikidataId: "Q893414",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Border",
    originalTitle: "\u092C\u0949\u0930\u094D\u0921\u0930",
    contentType: "movie",
    releaseYear: 1997,
    language: "Hindi",
    country: "India",
    director: "J.P. Dutta",
    productionInfo: "J.P. Films",
    ageRating: "UA",
    cast: ["Sunny Deol", "Suniel Shetty", "Akshaye Khanna", "Jackie Shroff"],
    genres: ["War", "Action", "Drama", "History"],
    tags: ["military", "longewala", "1971-war", "patriotic", "classic"],
    categories: ["indian_military", "classic_cinema"],
    runtimeMinutes: 176,
    communityRating: 7.9,
    popularityScore: 89,
    overview: "During the 1971 Indo-Pak war, a small company of 120 Indian soldiers holds the Longewala desert post all night against an entire armored tank regiment.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-01-10T08:00:00.000Z"
  },
  {
    movieId: "arch-lakshya-2004",
    wikidataId: "Q1800989",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Lakshya",
    originalTitle: "\u0932\u0915\u094D\u0937\u094D\u092F",
    contentType: "movie",
    releaseYear: 2004,
    language: "Hindi",
    country: "India",
    director: "Farhan Akhtar",
    productionInfo: "Excel Entertainment",
    ageRating: "U",
    cast: ["Hrithik Roshan", "Preity Zinta", "Amitabh Bachchan", "Boman Irani"],
    genres: ["War", "Drama", "Action"],
    tags: ["military", "coming-of-age", "kargil-war", "patriotic", "discipline"],
    categories: ["featured", "indian_military"],
    runtimeMinutes: 186,
    communityRating: 7.9,
    popularityScore: 90,
    overview: "An aimless young man joins the Indian Army on impulse, matures through rigorous training, and finds his true purpose on the icy cliffs of Kargil.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-01-14T15:00:00.000Z"
  },
  {
    movieId: "arch-major-2022",
    wikidataId: "Q97358086",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Major",
    originalTitle: "\u0C2E\u0C47\u0C1C\u0C30\u0C4D",
    contentType: "movie",
    releaseYear: 2022,
    language: "Telugu",
    country: "India",
    director: "Sashi Kiran Tikka",
    productionInfo: "Sony Pictures International Productions \u2022 G. Mahesh Babu Entertainment",
    ageRating: "UA",
    cast: ["Adivi Sesh", "Saiee Manjrekar", "Prakash Raj", "Revathi"],
    genres: ["Action", "Biography", "Drama"],
    tags: ["military", "nsg-commando", "patriotic", "biopic", "valor", "true-events"],
    categories: ["indian_military", "biographical_cinema"],
    runtimeMinutes: 150,
    communityRating: 8.1,
    popularityScore: 88,
    overview: "The life and sacrifice of Major Sandeep Unnikrishnan of the elite National Security Guard during the November 2008 Mumbai rescue operations.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-01-22T10:00:00.000Z"
  },
  {
    movieId: "arch-raazi-2018",
    wikidataId: "Q39073983",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Raazi",
    originalTitle: "\u0930\u093E\u091C\u093C\u0940",
    contentType: "movie",
    releaseYear: 2018,
    language: "Hindi",
    country: "India",
    director: "Meghna Gulzar",
    productionInfo: "Junglee Pictures \u2022 Dharma Productions",
    ageRating: "UA",
    cast: ["Alia Bhatt", "Vicky Kaushal", "Rajit Kapur", "Jaideep Ahlawat"],
    genres: ["Thriller", "Spy", "Drama", "History"],
    tags: ["espionage", "1971-war", "intelligence", "patriotic", "undercover"],
    categories: ["featured", "indian_military", "espionage_thrillers"],
    runtimeMinutes: 138,
    communityRating: 7.7,
    popularityScore: 91,
    overview: "A young Kashmiri woman agrees to marry into a Pakistani military family prior to the 1971 war to transmit critical naval intelligence back to India.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-01-25T14:00:00.000Z"
  },
  {
    movieId: "arch-parmanu-2018",
    wikidataId: "Q30609670",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Parmanu: The Story of Pokhran",
    originalTitle: "\u092A\u0930\u092E\u093E\u0923\u0941: \u0926 \u0938\u094D\u091F\u094B\u0930\u0940 \u0911\u092B \u092A\u094B\u0916\u0930\u0923",
    contentType: "movie",
    releaseYear: 2018,
    language: "Hindi",
    country: "India",
    director: "Abhishek Sharma",
    productionInfo: "JA Entertainment \u2022 Zee Studios",
    ageRating: "U",
    cast: ["John Abraham", "Diana Penty", "Boman Irani"],
    genres: ["History", "Thriller", "Drama"],
    tags: ["military", "science", "covert-ops", "patriotic", "true-events"],
    categories: ["indian_military", "historical_drama"],
    runtimeMinutes: 129,
    communityRating: 7.6,
    popularityScore: 84,
    overview: "Indian scientists and army engineers race against international spy satellites to conduct confidential nuclear tests in Pokhran in May 1998.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-indian-patriotic",
    addedAt: "2026-01-28T11:00:00.000Z"
  },
  {
    movieId: "arch-inception-2010",
    wikidataId: "Q25188",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q25188 \u2022 CC0 Public Domain",
    title: "Inception",
    originalTitle: "Inception",
    contentType: "movie",
    releaseYear: 2010,
    language: "English",
    country: "USA",
    director: "Christopher Nolan",
    productionInfo: "Syncopy \u2022 Legendary Pictures \u2022 Warner Bros.",
    ageRating: "PG-13",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Cillian Murphy", "Tom Hardy"],
    genres: ["Sci-Fi", "Action", "Thriller"],
    tags: ["mind-bending", "heist", "dreams", "nonlinear", "blockbuster"],
    categories: ["featured", "sci_fi_essentials", "action_thrillers"],
    runtimeMinutes: 148,
    communityRating: 8.8,
    popularityScore: 98,
    overview: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C-suite heir.",
    posterUrl: "",
    backdropUrl: "",
    trailerYoutubeUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0",
    franchiseId: "franchise-nolan-sci-fi",
    addedAt: "2026-02-20T16:00:00.000Z"
  },
  {
    movieId: "arch-interstellar-2014",
    wikidataId: "Q13417189",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q13417189 \u2022 CC0 Public Domain",
    title: "Interstellar",
    originalTitle: "Interstellar",
    contentType: "movie",
    releaseYear: 2014,
    language: "English",
    country: "USA",
    director: "Christopher Nolan",
    productionInfo: "Syncopy \u2022 Paramount Pictures \u2022 Warner Bros.",
    ageRating: "PG-13",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
    genres: ["Sci-Fi", "Drama", "Adventure"],
    tags: ["space", "time-dilation", "mind-bending", "epic", "emotional"],
    categories: ["featured", "sci_fi_essentials"],
    runtimeMinutes: 169,
    communityRating: 8.7,
    popularityScore: 99,
    overview: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft through a wormhole to find a new home for humanity.",
    posterUrl: "",
    backdropUrl: "",
    trailerYoutubeUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
    franchiseId: "franchise-nolan-sci-fi",
    addedAt: "2026-02-22T18:00:00.000Z"
  },
  {
    movieId: "arch-tenet-2020",
    wikidataId: "Q63985561",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q63985561 \u2022 CC0 Public Domain",
    title: "Tenet",
    originalTitle: "Tenet",
    contentType: "movie",
    releaseYear: 2020,
    language: "English",
    country: "UK",
    director: "Christopher Nolan",
    productionInfo: "Syncopy \u2022 Warner Bros. Pictures",
    ageRating: "PG-13",
    cast: ["John David Washington", "Robert Pattinson", "Elizabeth Debicki"],
    genres: ["Sci-Fi", "Action", "Spy", "Thriller"],
    tags: ["time-inversion", "espionage", "mind-bending", "tactical"],
    categories: ["sci_fi_essentials", "espionage_thrillers"],
    runtimeMinutes: 150,
    communityRating: 7.3,
    popularityScore: 89,
    overview: "Armed with only one word\u2014Tenet\u2014and fighting for the survival of the entire world, a Protagonist journeys through a twilight world of international espionage.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-nolan-sci-fi",
    addedAt: "2026-02-01T10:00:00.000Z"
  },
  {
    movieId: "arch-oppenheimer-2023",
    wikidataId: "Q108839994",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q108839994 \u2022 CC0 Public Domain",
    title: "Oppenheimer",
    originalTitle: "Oppenheimer",
    contentType: "movie",
    releaseYear: 2023,
    language: "English",
    country: "USA",
    director: "Christopher Nolan",
    productionInfo: "Syncopy \u2022 Atlas Entertainment \u2022 Universal Pictures",
    ageRating: "R",
    cast: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
    genres: ["Biography", "Drama", "History"],
    tags: ["science", "history", "biopic", "nonlinear", "award-winner"],
    categories: ["featured", "biographical_cinema", "historical_drama"],
    runtimeMinutes: 180,
    communityRating: 8.4,
    popularityScore: 97,
    overview: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-nolan-sci-fi",
    addedAt: "2026-02-24T12:00:00.000Z"
  },
  {
    movieId: "arch-dune-2021",
    wikidataId: "Q15270647",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q15270647 \u2022 CC0 Public Domain",
    title: "Dune: Part One",
    originalTitle: "Dune",
    contentType: "movie",
    releaseYear: 2021,
    language: "English",
    country: "USA",
    director: "Denis Villeneuve",
    productionInfo: "Legendary Pictures \u2022 Villeneuve Films",
    ageRating: "PG-13",
    cast: ["Timoth\xE9e Chalamet", "Rebecca Ferguson", "Oscar Isaac", "Zendaya"],
    genres: ["Sci-Fi", "Adventure", "Drama"],
    tags: ["space-opera", "arrakis", "epic", "desert-warfare"],
    categories: ["featured", "sci_fi_essentials"],
    runtimeMinutes: 155,
    communityRating: 8,
    popularityScore: 95,
    overview: "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-dune-chronicles",
    addedAt: "2026-02-19T14:00:00.000Z"
  },
  {
    movieId: "arch-dune-part-two-2024",
    wikidataId: "Q109288565",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q109288565 \u2022 CC0 Public Domain",
    title: "Dune: Part Two",
    originalTitle: "Dune: Part Two",
    contentType: "movie",
    releaseYear: 2024,
    language: "English",
    country: "USA",
    director: "Denis Villeneuve",
    productionInfo: "Legendary Pictures \u2022 Warner Bros. Pictures",
    ageRating: "PG-13",
    cast: ["Timoth\xE9e Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem"],
    genres: ["Sci-Fi", "Adventure", "Action"],
    tags: ["space-opera", "arrakis", "epic", "rebellion", "blockbuster"],
    categories: ["featured", "sci_fi_essentials"],
    runtimeMinutes: 166,
    communityRating: 8.6,
    popularityScore: 98,
    overview: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-dune-chronicles",
    addedAt: "2026-02-25T20:00:00.000Z"
  },
  {
    movieId: "arch-dune-messiah-2026",
    wikidataId: "Q125390122",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Dune: Messiah",
    originalTitle: "Dune: Messiah",
    contentType: "movie",
    releaseYear: 2026,
    language: "English",
    country: "USA",
    director: "Denis Villeneuve",
    productionInfo: "Legendary Pictures",
    ageRating: "PG-13",
    cast: ["Timoth\xE9e Chalamet", "Zendaya", "Florence Pugh"],
    genres: ["Sci-Fi", "Adventure", "Drama"],
    tags: ["space-opera", "arrakis", "upcoming", "epic"],
    categories: ["sci_fi_essentials"],
    runtimeMinutes: 160,
    communityRating: 8.5,
    popularityScore: 92,
    overview: "Twelve years into his reign as Emperor, Paul Atreides faces political conspiracy and the devastating consequences of the Fremen jihad across the known universe.",
    posterUrl: "",
    backdropUrl: "",
    franchiseId: "franchise-dune-chronicles",
    isUpcoming: true,
    addedAt: "2026-02-26T09:00:00.000Z"
  },
  {
    movieId: "arch-blade-runner-2049",
    wikidataId: "Q21500755",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q21500755 \u2022 CC0 Public Domain",
    title: "Blade Runner 2049",
    originalTitle: "Blade Runner 2049",
    contentType: "movie",
    releaseYear: 2017,
    language: "English",
    country: "USA",
    director: "Denis Villeneuve",
    productionInfo: "Alcon Entertainment \u2022 Columbia Pictures",
    ageRating: "R",
    cast: ["Ryan Gosling", "Harrison Ford", "Ana de Armas"],
    genres: ["Sci-Fi", "Mystery", "Drama"],
    tags: ["cyberpunk", "neo-noir", "dystopian", "visual-masterpiece"],
    categories: ["featured", "sci_fi_essentials"],
    runtimeMinutes: 164,
    communityRating: 8,
    popularityScore: 92,
    overview: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who has been missing for thirty years.",
    posterUrl: "",
    backdropUrl: "",
    addedAt: "2026-02-05T11:00:00.000Z"
  },
  {
    movieId: "arch-arrival-2016",
    wikidataId: "Q20382729",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q20382729 \u2022 CC0 Public Domain",
    title: "Arrival",
    originalTitle: "Arrival",
    contentType: "movie",
    releaseYear: 2016,
    language: "English",
    country: "USA",
    director: "Denis Villeneuve",
    productionInfo: "FilmNation Entertainment \u2022 Lava Bear Films",
    ageRating: "PG-13",
    cast: ["Amy Adams", "Jeremy Renner", "Forest Whitaker"],
    genres: ["Sci-Fi", "Drama", "Mystery"],
    tags: ["first-contact", "linguistics", "mind-bending", "emotional", "short-watch"],
    categories: ["sci_fi_essentials"],
    runtimeMinutes: 116,
    communityRating: 7.9,
    popularityScore: 91,
    overview: "A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.",
    posterUrl: "",
    backdropUrl: "",
    addedAt: "2026-02-06T12:00:00.000Z"
  },
  {
    movieId: "arch-family-man-2019",
    wikidataId: "Q65065645",
    metadataProvider: "tvmaze",
    providerAttribution: "TVmaze Open Metadata \u2022 CC BY-SA",
    title: "The Family Man",
    originalTitle: "\u0926 \u092B\u0948\u092E\u093F\u0932\u0940 \u092E\u0948\u0928",
    contentType: "series",
    releaseYear: 2019,
    language: "Hindi",
    country: "India",
    director: "Raj & DK",
    productionInfo: "D2R Films \u2022 Amazon MGM Studios",
    ageRating: "UA-16+",
    cast: ["Manoj Bajpayee", "Sharib Hashmi", "Priyamani", "Samantha Ruth Prabhu"],
    genres: ["Spy", "Action", "Thriller", "Drama"],
    tags: ["intelligence", "espionage", "counter-terrorism", "patriotic", "tactical"],
    categories: ["featured", "acclaimed_series", "espionage_thrillers"],
    runtimeMinutes: 45,
    communityRating: 8.7,
    popularityScore: 96,
    overview: "A middle-class man secretly works as a senior intelligence officer for the Threat Analysis and Surveillance Cell while protecting his family from his high-stakes job.",
    posterUrl: "",
    backdropUrl: "",
    totalSeasons: 2,
    totalEpisodes: 19,
    showStatus: "ongoing",
    addedAt: "2026-02-12T10:00:00.000Z"
  },
  {
    movieId: "arch-severance-2022",
    wikidataId: "Q104843043",
    metadataProvider: "tvmaze",
    providerAttribution: "TVmaze Open Metadata \u2022 CC BY-SA",
    title: "Severance",
    originalTitle: "Severance",
    contentType: "series",
    releaseYear: 2022,
    language: "English",
    country: "USA",
    director: "Ben Stiller",
    productionInfo: "Red Hour Productions \u2022 Fifth Season",
    ageRating: "TV-MA",
    cast: ["Adam Scott", "Britt Lower", "John Turturro", "Patricia Arquette"],
    genres: ["Sci-Fi", "Mystery", "Thriller", "Drama"],
    tags: ["mind-bending", "dystopian", "workplace-mystery", "psychological"],
    categories: ["featured", "acclaimed_series", "sci_fi_essentials"],
    runtimeMinutes: 50,
    communityRating: 8.7,
    popularityScore: 95,
    overview: "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.",
    posterUrl: "",
    backdropUrl: "",
    totalSeasons: 2,
    totalEpisodes: 19,
    showStatus: "ongoing",
    addedAt: "2026-02-21T16:00:00.000Z"
  },
  {
    movieId: "arch-dark-2017",
    wikidataId: "Q28497865",
    metadataProvider: "tvmaze",
    providerAttribution: "TVmaze Open Metadata \u2022 CC BY-SA",
    title: "Dark",
    originalTitle: "Dark",
    contentType: "series",
    releaseYear: 2017,
    language: "German",
    country: "Germany",
    director: "Baran bo Odar",
    productionInfo: "Wiedemann & Berg Television",
    ageRating: "TV-MA",
    cast: ["Louis Hofmann", "Lisa Vicari", "Andreas Pietschmann"],
    genres: ["Sci-Fi", "Mystery", "Thriller", "Drama"],
    tags: ["time-travel", "mind-bending", "nonlinear", "complex"],
    categories: ["acclaimed_series", "sci_fi_essentials", "world_cinema"],
    runtimeMinutes: 55,
    communityRating: 8.7,
    popularityScore: 94,
    overview: "A family saga with a supernatural twist, set in a German town where the disappearance of two young children exposes the relationships among four families.",
    posterUrl: "",
    backdropUrl: "",
    totalSeasons: 3,
    totalEpisodes: 26,
    showStatus: "completed",
    addedAt: "2026-02-08T10:00:00.000Z"
  },
  {
    movieId: "arch-parasite-2019",
    wikidataId: "Q47703",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q47703 \u2022 CC0 Public Domain",
    title: "Parasite",
    originalTitle: "\uAE30\uC0DD\uCDA9",
    contentType: "movie",
    releaseYear: 2019,
    language: "Korean",
    country: "South Korea",
    director: "Bong Joon-ho",
    productionInfo: "Barunson E&A \u2022 CJ Entertainment",
    ageRating: "R",
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik"],
    genres: ["Thriller", "Drama"],
    tags: ["social-satire", "award-winner", "international", "twist"],
    categories: ["featured", "world_cinema", "action_thrillers"],
    runtimeMinutes: 132,
    communityRating: 8.5,
    popularityScore: 96,
    overview: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    posterUrl: "",
    backdropUrl: "",
    addedAt: "2026-02-23T19:00:00.000Z"
  },
  {
    movieId: "arch-rrr-2022",
    wikidataId: "Q60837068",
    metadataProvider: "wikidata",
    providerAttribution: "Wikidata Entity Q60837068 \u2022 CC0 Public Domain",
    title: "RRR",
    originalTitle: "\u0C30\u0C4C\u0C26\u0C4D\u0C30\u0C02 \u0C30\u0C23\u0C02 \u0C30\u0C41\u0C27\u0C3F\u0C30\u0C02",
    contentType: "movie",
    releaseYear: 2022,
    language: "Telugu",
    country: "India",
    director: "S. S. Rajamouli",
    productionInfo: "DVV Entertainment",
    ageRating: "UA",
    cast: ["N. T. Rama Rao Jr.", "Ram Charan", "Ajay Devgn", "Alia Bhatt"],
    genres: ["Action", "Drama", "History"],
    tags: ["patriotic", "rebellion", "epic", "friendship", "blockbuster"],
    categories: ["featured", "world_cinema", "action_thrillers"],
    runtimeMinutes: 187,
    communityRating: 7.8,
    popularityScore: 95,
    overview: "A fearless revolutionary and an officer in the British force, once deep friends, decide to join forces and chart out an inspirational path of freedom against tyrannical rule.",
    posterUrl: "",
    backdropUrl: "",
    addedAt: "2026-02-17T14:00:00.000Z"
  },
  {
    movieId: "arch-chrono-nexus-2024",
    wikidataId: "Q19840101",
    metadataProvider: "local_json",
    providerAttribution: "CineShelf Local JSON Movie Database",
    title: "Chrono Signal",
    originalTitle: "Chrono Signal",
    contentType: "short_film",
    releaseYear: 2024,
    language: "English",
    country: "UK",
    director: "Alex Garland",
    productionInfo: "DNA Films",
    ageRating: "PG-13",
    cast: ["Sonoya Mizuno", "Domhnall Gleeson"],
    genres: ["Sci-Fi", "Thriller"],
    tags: ["short-watch", "time-loop", "mind-bending", "tight-runtime"],
    categories: ["sci_fi_essentials"],
    runtimeMinutes: 88,
    communityRating: 7.7,
    popularityScore: 82,
    overview: "An orbital telemetry analyst intercepts a 90-minute distress transmission originating from her own station twelve hours in the future.",
    posterUrl: "",
    backdropUrl: "",
    addedAt: "2026-01-30T10:00:00.000Z"
  }
];

// src/utils/catalog.ts
function buildCinematicPosterSvg(title, subtitle, year, accentHex, secondaryHex) {
  const safeTitle = (title || "Untitled").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeSubtitle = (subtitle || "CINESHELF NEXUS").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const words = safeTitle.split(" ");
  const line1 = words.slice(0, 3).join(" ");
  const line2 = words.slice(3, 6).join(" ");
  const line3 = words.slice(6).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#070910"/>
        <stop offset="50%" stop-color="${secondaryHex}"/>
        <stop offset="100%" stop-color="#05060a"/>
      </linearGradient>
      <radialGradient id="glow" cx="75%" cy="20%" r="60%">
        <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="${accentHex}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="accentBar" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentHex}"/>
        <stop offset="100%" stop-color="${secondaryHex}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="900" fill="url(#bg)"/>
    <rect width="600" height="900" fill="url(#glow)"/>
    <circle cx="460" cy="190" r="170" fill="none" stroke="${accentHex}" stroke-opacity="0.18" stroke-width="1.5"/>
    <circle cx="460" cy="190" r="240" fill="none" stroke="${accentHex}" stroke-opacity="0.1" stroke-width="1"/>
    <path d="M 48 64 L 552 64 L 552 836 L 48 836 Z" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5"/>
    <rect x="78" y="96" width="84" height="28" rx="4" fill="${accentHex}" fill-opacity="0.2" stroke="${accentHex}" stroke-opacity="0.5"/>
    <text x="120" y="115" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="2">${year}</text>
    <text x="78" y="620" fill="${accentHex}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="3">${safeSubtitle.toUpperCase()}</text>
    <text x="78" y="675" fill="#ffffff" font-family="Georgia, serif" font-size="42" font-weight="700">${line1}</text>
    ${line2 ? `<text x="78" y="728" fill="#f1f5f9" font-family="Georgia, serif" font-size="40" font-weight="700">${line2}</text>` : ""}
    ${line3 ? `<text x="78" y="778" fill="#cbd5e1" font-family="Georgia, serif" font-size="34" font-weight="700">${line3}</text>` : ""}
    <rect x="78" y="802" width="140" height="4" fill="url(#accentBar)" rx="2"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
function buildCinematicBackdropSvg(title, subtitle, year, accentHex, secondaryHex) {
  const safeTitle = (title || "Untitled").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeSubtitle = (subtitle || "CINESHELF NEXUS").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#05070d"/>
        <stop offset="55%" stop-color="${secondaryHex}"/>
        <stop offset="100%" stop-color="#040508"/>
      </linearGradient>
      <radialGradient id="flare" cx="78%" cy="32%" r="55%">
        <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="${accentHex}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
    <rect width="1280" height="720" fill="url(#flare)"/>
    <circle cx="980" cy="240" r="220" fill="none" stroke="${accentHex}" stroke-opacity="0.16" stroke-width="1.5"/>
    <circle cx="980" cy="240" r="320" fill="none" stroke="${accentHex}" stroke-opacity="0.08" stroke-width="1"/>
    <text x="88" y="540" fill="${accentHex}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" letter-spacing="4">${safeSubtitle.toUpperCase()} \u2022 ${year}</text>
    <text x="88" y="605" fill="#ffffff" font-family="Georgia, serif" font-size="56" font-weight="700">${safeTitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
var PALETTE_BY_GENRE = {
  War: ["#f59e0b", "#1c1917"],
  Action: ["#e11d48", "#1e1b4b"],
  "Sci-Fi": ["#38bdf8", "#0f172a"],
  Biography: ["#fbbf24", "#27272a"],
  Thriller: ["#10b981", "#064e3b"],
  Spy: ["#2dd4bf", "#134e4a"],
  History: ["#fb923c", "#292524"],
  Drama: ["#a855f7", "#1e1b4b"],
  Mystery: ["#6366f1", "#111827"]
};
function getGenrePalette(genres) {
  for (const g of genres || []) {
    if (PALETTE_BY_GENRE[g]) return PALETTE_BY_GENRE[g];
  }
  return ["#f59e0b", "#1e293b"];
}
var DEFAULT_AVATAR_ASSET = buildCinematicPosterSvg(
  "CineShelf Member",
  "PERSONAL ARCHIVE",
  2026,
  "#f59e0b",
  "#0f172a"
);
function makeStreaming(inProviders, usProviders, gbProviders = usProviders) {
  const now = "2026-03-01T00:00:00.000Z";
  return {
    IN: {
      region: "IN",
      state: inProviders.length > 0 ? "available" : "unavailable",
      lastCheckedAt: now,
      providers: inProviders.map((p) => ({
        providerId: p.id,
        providerName: p.name,
        monetizationType: p.type,
        officialUrl: p.url
      }))
    },
    US: {
      region: "US",
      state: usProviders.length > 0 ? "available" : "unavailable",
      lastCheckedAt: now,
      providers: usProviders.map((p) => ({
        providerId: p.id,
        providerName: p.name,
        monetizationType: p.type,
        officialUrl: p.url
      }))
    },
    GB: {
      region: "GB",
      state: gbProviders.length > 0 ? "available" : "unavailable",
      lastCheckedAt: now,
      providers: gbProviders.map((p) => ({
        providerId: p.id,
        providerName: p.name,
        monetizationType: p.type,
        officialUrl: p.url
      }))
    }
  };
}
var STREAMING_BY_MOVIE_ID = {
  "arch-uri-2019": makeStreaming(
    [{ id: "zee5", name: "ZEE5", type: "subscription", url: "https://www.zee5.com" }],
    [{ id: "apple", name: "Apple TV", type: "rent", url: "https://tv.apple.com" }]
  ),
  "arch-shershaah-2021": makeStreaming(
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }],
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }]
  ),
  "arch-pippa-2023": makeStreaming(
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }],
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }]
  ),
  "arch-sam-bahadur-2023": makeStreaming(
    [{ id: "zee5", name: "ZEE5", type: "subscription", url: "https://www.zee5.com" }],
    [{ id: "prime", name: "Amazon Prime Video", type: "rent", url: "https://www.primevideo.com" }]
  ),
  "arch-border-1997": makeStreaming(
    [
      { id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" },
      { id: "youtube", name: "YouTube Movies", type: "free", url: "https://www.youtube.com" }
    ],
    [{ id: "prime", name: "Amazon Prime Video", type: "rent", url: "https://www.primevideo.com" }]
  ),
  "arch-lakshya-2004": makeStreaming(
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }],
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }]
  ),
  "arch-major-2022": makeStreaming(
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }],
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }]
  ),
  "arch-raazi-2018": makeStreaming(
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }],
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }]
  ),
  "arch-parmanu-2018": makeStreaming(
    [
      { id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" },
      { id: "zee5", name: "ZEE5", type: "subscription", url: "https://www.zee5.com" }
    ],
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }]
  ),
  "arch-inception-2010": makeStreaming(
    [
      { id: "jio", name: "JioCinema", type: "subscription", url: "https://www.jiocinema.com" },
      { id: "prime", name: "Amazon Prime Video", type: "rent", url: "https://www.primevideo.com" }
    ],
    [
      { id: "max", name: "Max", type: "subscription", url: "https://www.max.com" },
      { id: "apple", name: "Apple TV", type: "rent", url: "https://tv.apple.com" }
    ]
  ),
  "arch-interstellar-2014": makeStreaming(
    [
      { id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" },
      { id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }
    ],
    [
      { id: "paramount", name: "Paramount+", type: "subscription", url: "https://www.paramountplus.com" },
      { id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }
    ]
  ),
  "arch-tenet-2020": makeStreaming(
    [{ id: "prime", name: "Amazon Prime Video", type: "rent", url: "https://www.primevideo.com" }],
    [{ id: "max", name: "Max", type: "subscription", url: "https://www.max.com" }]
  ),
  "arch-oppenheimer-2023": makeStreaming(
    [{ id: "jio", name: "JioCinema", type: "subscription", url: "https://www.jiocinema.com" }],
    [{ id: "peacock", name: "Peacock", type: "subscription", url: "https://www.peacocktv.com" }]
  ),
  "arch-dune-2021": makeStreaming(
    [
      { id: "jio", name: "JioCinema", type: "subscription", url: "https://www.jiocinema.com" },
      { id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }
    ],
    [{ id: "max", name: "Max", type: "subscription", url: "https://www.max.com" }]
  ),
  "arch-dune-part-two-2024": makeStreaming(
    [{ id: "jio", name: "JioCinema", type: "subscription", url: "https://www.jiocinema.com" }],
    [{ id: "max", name: "Max", type: "subscription", url: "https://www.max.com" }]
  ),
  "arch-dune-messiah-2026": makeStreaming([], []),
  "arch-blade-runner-2049": makeStreaming(
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }],
    [{ id: "apple", name: "Apple TV", type: "rent", url: "https://tv.apple.com" }]
  ),
  "arch-arrival-2016": makeStreaming(
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }],
    [{ id: "paramount", name: "Paramount+", type: "subscription", url: "https://www.paramountplus.com" }]
  ),
  "arch-family-man-2019": makeStreaming(
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }],
    [{ id: "prime", name: "Amazon Prime Video", type: "subscription", url: "https://www.primevideo.com" }]
  ),
  "arch-severance-2022": makeStreaming(
    [{ id: "apple", name: "Apple TV+", type: "subscription", url: "https://tv.apple.com" }],
    [{ id: "apple", name: "Apple TV+", type: "subscription", url: "https://tv.apple.com" }]
  ),
  "arch-dark-2017": makeStreaming(
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }],
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }]
  ),
  "arch-parasite-2019": makeStreaming(
    [{ id: "sonyliv", name: "SonyLIV", type: "subscription", url: "https://www.sonyliv.com" }],
    [{ id: "max", name: "Max", type: "subscription", url: "https://www.max.com" }]
  ),
  "arch-rrr-2022": makeStreaming(
    [
      { id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" },
      { id: "zee5", name: "ZEE5", type: "subscription", url: "https://www.zee5.com" }
    ],
    [{ id: "netflix", name: "Netflix", type: "subscription", url: "https://www.netflix.com" }]
  ),
  "arch-chrono-nexus-2024": makeStreaming(
    [{ id: "mubi", name: "MUBI", type: "subscription", url: "https://mubi.com" }],
    [{ id: "mubi", name: "MUBI", type: "subscription", url: "https://mubi.com" }]
  )
};
var EPISODES_BY_MOVIE_ID = {
  "arch-family-man-2019": [
    { code: "S1E1", seasonNumber: 1, episodeNumber: 1, title: "The Family Man", releaseDate: "2019-09-20", runtimeMinutes: 53 },
    { code: "S1E2", seasonNumber: 1, episodeNumber: 2, title: "Sleepers", releaseDate: "2019-09-20", runtimeMinutes: 47 },
    { code: "S1E3", seasonNumber: 1, episodeNumber: 3, title: "Anti-National", releaseDate: "2019-09-20", runtimeMinutes: 46 },
    { code: "S1E4", seasonNumber: 1, episodeNumber: 4, title: "Patriots", releaseDate: "2019-09-20", runtimeMinutes: 42 },
    { code: "S2E1", seasonNumber: 2, episodeNumber: 1, title: "Exile", releaseDate: "2021-06-04", runtimeMinutes: 59 },
    { code: "S2E2", seasonNumber: 2, episodeNumber: 2, title: "Weapon", releaseDate: "2021-06-04", runtimeMinutes: 50 }
  ],
  "arch-severance-2022": [
    { code: "S1E1", seasonNumber: 1, episodeNumber: 1, title: "Good News About Hell", releaseDate: "2022-02-18", runtimeMinutes: 57 },
    { code: "S1E2", seasonNumber: 1, episodeNumber: 2, title: "Half Loop", releaseDate: "2022-02-18", runtimeMinutes: 47 },
    { code: "S1E3", seasonNumber: 1, episodeNumber: 3, title: "In Perpetuity", releaseDate: "2022-02-25", runtimeMinutes: 52 },
    { code: "S2E1", seasonNumber: 2, episodeNumber: 1, title: "Hello, Ms. Cobel", releaseDate: "2025-01-17", runtimeMinutes: 54 }
  ],
  "arch-dark-2017": [
    { code: "S1E1", seasonNumber: 1, episodeNumber: 1, title: "Secrets", releaseDate: "2017-12-01", runtimeMinutes: 52 },
    { code: "S1E2", seasonNumber: 1, episodeNumber: 2, title: "Lies", releaseDate: "2017-12-01", runtimeMinutes: 45 },
    { code: "S1E3", seasonNumber: 1, episodeNumber: 3, title: "Past and Present", releaseDate: "2017-12-01", runtimeMinutes: 46 }
  ]
};
function hydrateCatalogItemArtwork(item) {
  const genres = Array.isArray(item.genres) && item.genres.length > 0 ? item.genres : ["Drama"];
  const [accentHex, secondaryHex] = getGenrePalette(genres);
  const subtitle = `${genres.slice(0, 2).join(" \u2022 ").toUpperCase()}${item.director ? ` \u2022 ${item.director}` : ""}`;
  const releaseYear = Number(item.releaseYear) || 2024;
  const posterUrl = item.posterUrl && item.posterUrl.trim().length > 0 ? item.posterUrl.trim() : buildCinematicPosterSvg(item.title, subtitle, releaseYear, accentHex, secondaryHex);
  const backdropUrl = item.backdropUrl && item.backdropUrl.trim().length > 0 ? item.backdropUrl.trim() : buildCinematicBackdropSvg(item.title, subtitle, releaseYear, accentHex, secondaryHex);
  return {
    movieId: item.movieId,
    wikidataId: item.wikidataId,
    metadataProvider: item.metadataProvider || "local_json",
    providerExternalId: item.providerExternalId || item.wikidataId || item.movieId,
    providerAttribution: item.providerAttribution || "CineShelf Local JSON Movie Database",
    title: item.title,
    originalTitle: item.originalTitle || item.title,
    contentType: item.contentType || "movie",
    releaseYear,
    language: item.language || "English",
    country: item.country || "International",
    director: item.director || "Unknown Director",
    productionInfo: item.productionInfo || "Independent Production",
    ageRating: item.ageRating || "NR",
    cast: Array.isArray(item.cast) ? item.cast : [],
    genres,
    tags: Array.isArray(item.tags) ? item.tags : [],
    categories: Array.isArray(item.categories) ? item.categories : [],
    runtimeMinutes: Number(item.runtimeMinutes) || 120,
    communityRating: Number(item.communityRating) || 7.8,
    popularityScore: Number(item.popularityScore) || 80,
    overview: item.overview || "Verified movie entry in the local CineShelf database.",
    posterUrl,
    backdropUrl,
    trailerYoutubeUrl: item.trailerYoutubeUrl,
    franchiseId: item.franchiseId,
    totalSeasons: item.totalSeasons,
    totalEpisodes: item.totalEpisodes,
    showStatus: item.showStatus,
    episodes: item.episodes || EPISODES_BY_MOVIE_ID[item.movieId],
    isUpcoming: item.isUpcoming,
    addedAt: item.addedAt || "2026-02-01T00:00:00.000Z",
    isManuallyEdited: item.isManuallyEdited,
    streamingByRegion: item.streamingByRegion && Object.keys(item.streamingByRegion).length > 0 ? item.streamingByRegion : STREAMING_BY_MOVIE_ID[item.movieId] || makeStreaming([], [])
  };
}
var CURATED_CATALOG = localMovies_default.map(
  (entry) => hydrateCatalogItemArtwork(entry)
);
function queryLocalCatalog(catalog, options = {}) {
  const q = (options.q ?? options.query ?? "").trim().toLowerCase();
  const actor = (options.actor || "").trim().toLowerCase();
  const genre = (options.genre || "").trim();
  const year = options.year !== void 0 && options.year !== "" && options.year !== "all" ? Number(options.year) : null;
  const language = (options.language || "").trim();
  const country = (options.country || "").trim();
  const director = (options.director || "").trim();
  const minRating = Number(options.minRating || 0);
  const maxRuntime = Number(options.maxRuntime || 0);
  const contentType = (options.contentType || "").trim();
  const category = (options.category || "").trim();
  const provider = (options.provider || "").trim();
  const sortBy = options.sortBy || "popularity";
  let results = [...catalog];
  if (q) {
    results = results.filter(
      (item) => item.title.toLowerCase().includes(q) || item.originalTitle && item.originalTitle.toLowerCase().includes(q) || item.director.toLowerCase().includes(q) || item.cast.some((c) => c.toLowerCase().includes(q)) || item.tags.some((tag) => tag.toLowerCase().includes(q)) || item.overview.toLowerCase().includes(q) || item.productionInfo && item.productionInfo.toLowerCase().includes(q) || item.wikidataId && item.wikidataId.toLowerCase() === q
    );
  }
  if (actor) {
    results = results.filter((item) => item.cast.some((c) => c.toLowerCase().includes(actor)));
  }
  if (genre && genre !== "all") {
    results = results.filter((item) => item.genres.some((g) => g.toLowerCase() === genre.toLowerCase()));
  }
  if (year && !Number.isNaN(year)) {
    results = results.filter((item) => item.releaseYear === year);
  }
  if (language && language !== "all") {
    results = results.filter((item) => item.language.toLowerCase() === language.toLowerCase());
  }
  if (country && country !== "all") {
    results = results.filter((item) => item.country.toLowerCase() === country.toLowerCase());
  }
  if (director && director !== "all") {
    results = results.filter((item) => item.director.toLowerCase().includes(director.toLowerCase()));
  }
  if (minRating > 0) {
    results = results.filter((item) => item.communityRating >= minRating);
  }
  if (maxRuntime > 0 && maxRuntime < 1e3) {
    results = results.filter((item) => item.runtimeMinutes <= maxRuntime);
  }
  if (contentType && contentType !== "all") {
    results = results.filter((item) => item.contentType === contentType);
  }
  if (category && category !== "all") {
    if (category === "recently_added") {
      results = [...results].sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
    } else {
      results = results.filter((item) => (item.categories || []).includes(category));
    }
  }
  if (provider && provider !== "all") {
    results = results.filter((item) => (item.metadataProvider || "local_json") === provider);
  }
  results.sort((a, b) => {
    if (sortBy === "rating") return b.communityRating - a.communityRating;
    if (sortBy === "year_desc" || sortBy === "newest") return b.releaseYear - a.releaseYear;
    if (sortBy === "year_asc" || sortBy === "oldest") return a.releaseYear - b.releaseYear;
    if (sortBy === "title_asc" || sortBy === "alphabetical") return a.title.localeCompare(b.title);
    if (sortBy === "recently_added") return (b.addedAt || "").localeCompare(a.addedAt || "");
    return b.popularityScore - a.popularityScore;
  });
  return results;
}

// src/utils/metadataProviders.ts
function stripHtmlTags(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}
function normalizeTvMazeShowToCatalogItem(rawShow) {
  const show = rawShow;
  const releaseYear = show.premiered ? Number(show.premiered.slice(0, 4)) || (/* @__PURE__ */ new Date()).getFullYear() : (/* @__PURE__ */ new Date()).getFullYear();
  const genres = Array.isArray(show.genres) && show.genres.length > 0 ? show.genres : ["Drama"];
  const isAnime = show.type?.toLowerCase() === "animation" && (show.language?.toLowerCase() === "japanese" || genres.includes("Anime"));
  const contentType = isAnime ? "anime" : show.type?.toLowerCase() === "animation" ? "animated_series" : show.type?.toLowerCase() === "documentary" ? "documentary" : "series";
  const runtimeMinutes = Number(show.averageRuntime || show.runtime || 45);
  const country = show.network?.country?.name || show.webChannel?.country?.name || "International";
  const networkName = show.network?.name || show.webChannel?.name || "Television Network";
  const cast = (show._embedded?.cast || []).map((c) => c.person?.name).filter((n) => Boolean(n)).slice(0, 8);
  const rawEpisodes = show._embedded?.episodes || [];
  const episodes = rawEpisodes.filter((ep) => typeof ep.season === "number" && typeof ep.number === "number").map((ep) => ({
    code: `S${ep.season}E${ep.number}`,
    seasonNumber: Number(ep.season),
    episodeNumber: Number(ep.number),
    title: ep.name || `Episode ${ep.number}`,
    releaseDate: ep.airdate || `${releaseYear}-01-01`,
    runtimeMinutes: Number(ep.runtime || runtimeMinutes)
  }));
  const seasonNumbers = new Set(episodes.map((e) => e.seasonNumber));
  const totalSeasons = show._embedded?.seasons?.length || (seasonNumbers.size > 0 ? seasonNumbers.size : 1);
  const totalEpisodes = episodes.length > 0 ? episodes.length : totalSeasons * 8;
  const posterUrl = show.image?.original || show.image?.medium || "";
  const backdropUrl = show.image?.original || show.image?.medium || "";
  const summary = stripHtmlTags(show.summary) || `${show.name} (${releaseYear}) broadcast on ${networkName}.`;
  return hydrateCatalogItemArtwork({
    movieId: `tvmaze-${show.id}`,
    metadataProvider: "tvmaze",
    providerExternalId: String(show.id),
    providerAttribution: "Data & artwork provided by TVmaze.com (CC BY-SA)",
    title: show.name,
    originalTitle: show.name,
    contentType,
    releaseYear,
    language: show.language || "English",
    country,
    director: networkName,
    productionInfo: networkName,
    ageRating: "TV-14",
    cast,
    genres,
    tags: ["tvmaze", show.status?.toLowerCase() || "series", networkName.toLowerCase().replace(/\s+/g, "-")],
    categories: ["acclaimed_series"],
    runtimeMinutes,
    communityRating: Number(show.rating?.average || 7.8),
    popularityScore: Math.round(Number(show.rating?.average || 7.5) * 10),
    overview: summary,
    posterUrl,
    backdropUrl,
    totalSeasons,
    totalEpisodes,
    showStatus: show.status?.toLowerCase() === "ended" ? "completed" : "ongoing",
    episodes: episodes.length > 0 ? episodes : void 0,
    addedAt: (/* @__PURE__ */ new Date()).toISOString(),
    streamingByRegion: {}
  });
}
var mapTvMazeShowToCatalogItem = normalizeTvMazeShowToCatalogItem;
async function searchMultiSourceMetadata(queryStr, providerOrCatalog, catalogOverride = CURATED_CATALOG) {
  const effectiveCatalog = Array.isArray(providerOrCatalog) ? providerOrCatalog : catalogOverride;
  const providerFilter = typeof providerOrCatalog === "string" ? providerOrCatalog : "auto";
  const localMatches = providerFilter === "tvmaze" ? [] : queryLocalCatalog(effectiveCatalog, { q: queryStr });
  const results = [...localMatches];
  const providersUsed = new Set(
    providerFilter === "tvmaze" ? [] : ["local_json"]
  );
  let errorNotice;
  if (queryStr.trim().length >= 2 && (providerFilter === "auto" || providerFilter === "all" || providerFilter === "tvmaze")) {
    try {
      const resp = await fetch(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(queryStr.trim())}`
      );
      if (resp.ok) {
        const rows = await resp.json();
        providersUsed.add("tvmaze");
        for (const r of rows.slice(0, 6)) {
          if (r.show && r.show.name) {
            const norm = normalizeTvMazeShowToCatalogItem(r.show);
            if (!results.some((ex) => ex.title.toLowerCase() === norm.title.toLowerCase())) {
              results.push(norm);
            }
          }
        }
      }
    } catch {
      errorNotice = "External TVmaze lookup offline; displaying local database results.";
    }
  }
  return {
    results,
    providersUsed: Array.from(providersUsed),
    errorNotice
  };
}
function splitListField(val) {
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof val === "string") {
    return val.split(/[;|,]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
function extractWikidataQId(raw) {
  if (typeof raw !== "string") return void 0;
  const match = raw.match(/(Q\d+)/i);
  return match ? match[1].toUpperCase() : void 0;
}
function extractBindingValue(field) {
  if (!field) return "";
  if (typeof field === "string" || typeof field === "number") return String(field).trim();
  if (typeof field === "object" && field !== null && "value" in field) {
    return String(field.value || "").trim();
  }
  return "";
}
function mergeCatalogItemPreservingEdits(existing, incoming) {
  const preservedFields = [];
  if (existing.isManuallyEdited) {
    preservedFields.push("title", "overview", "director", "posterUrl", "backdropUrl");
    return {
      merged: {
        ...incoming,
        ...existing,
        movieId: existing.movieId,
        wikidataId: existing.wikidataId || incoming.wikidataId,
        originalTitle: existing.originalTitle || incoming.originalTitle,
        productionInfo: existing.productionInfo || incoming.productionInfo,
        ageRating: existing.ageRating || incoming.ageRating,
        cast: existing.cast.length > 0 ? existing.cast : incoming.cast,
        genres: existing.genres.length > 0 ? existing.genres : incoming.genres,
        tags: Array.from(/* @__PURE__ */ new Set([...existing.tags, ...incoming.tags])),
        categories: Array.from(/* @__PURE__ */ new Set([...existing.categories || [], ...incoming.categories || []])),
        isManuallyEdited: true
      },
      preservedFields
    };
  }
  const keepExistingPoster = existing.posterUrl && !existing.posterUrl.startsWith("data:image/svg+xml") && (!incoming.posterUrl || incoming.posterUrl.startsWith("data:image/svg+xml"));
  if (keepExistingPoster) preservedFields.push("posterUrl");
  const keepExistingBackdrop = existing.backdropUrl && !existing.backdropUrl.startsWith("data:image/svg+xml") && (!incoming.backdropUrl || incoming.backdropUrl.startsWith("data:image/svg+xml"));
  if (keepExistingBackdrop) preservedFields.push("backdropUrl");
  return {
    merged: hydrateCatalogItemArtwork({
      ...existing,
      ...incoming,
      movieId: existing.movieId,
      wikidataId: incoming.wikidataId || existing.wikidataId,
      posterUrl: keepExistingPoster ? existing.posterUrl : incoming.posterUrl || existing.posterUrl,
      backdropUrl: keepExistingBackdrop ? existing.backdropUrl : incoming.backdropUrl || existing.backdropUrl,
      tags: Array.from(/* @__PURE__ */ new Set([...existing.tags, ...incoming.tags])),
      categories: Array.from(/* @__PURE__ */ new Set([...existing.categories || [], ...incoming.categories || []]))
    }),
    preservedFields
  };
}
function mapRawRecordToCandidate(raw, index, defaultSource) {
  const warnings = [];
  const rawTitle = extractBindingValue(raw.title) || extractBindingValue(raw.itemLabel) || extractBindingValue(raw.label) || extractBindingValue(raw.name);
  if (!rawTitle) {
    warnings.push(`Row ${index + 1}: Missing movie title.`);
  }
  const wikidataId = extractWikidataQId(extractBindingValue(raw.wikidataId)) || extractWikidataQId(extractBindingValue(raw.item)) || extractWikidataQId(extractBindingValue(raw.id));
  const rawYearStr = extractBindingValue(raw.releaseYear) || extractBindingValue(raw.year) || extractBindingValue(raw.publicationDate) || extractBindingValue(raw.releaseDate);
  const parsedYear = rawYearStr ? Number(String(rawYearStr).slice(0, 4)) : NaN;
  const releaseYear = !Number.isNaN(parsedYear) && parsedYear >= 1888 && parsedYear <= 2035 ? parsedYear : 2024;
  if (Number.isNaN(parsedYear)) {
    warnings.push(`"${rawTitle || `Row ${index + 1}`}": Missing or invalid releaseYear, defaulted to 2024.`);
  }
  const director = extractBindingValue(raw.director) || extractBindingValue(raw.directorLabel) || "Unknown Director";
  if (director === "Unknown Director") {
    warnings.push(`"${rawTitle || `Row ${index + 1}`}": Director not specified.`);
  }
  const originalTitle = extractBindingValue(raw.originalTitle) || extractBindingValue(raw.nativeLabel) || rawTitle;
  const language = extractBindingValue(raw.language) || extractBindingValue(raw.originalLanguageLabel) || "English";
  const country = extractBindingValue(raw.country) || extractBindingValue(raw.countryOfOriginLabel) || "International";
  const runtimeRaw = extractBindingValue(raw.runtimeMinutes) || extractBindingValue(raw.duration) || extractBindingValue(raw.runtime);
  const runtimeMinutes = Number(runtimeRaw) > 0 ? Math.round(Number(runtimeRaw)) : 120;
  const productionInfo = extractBindingValue(raw.productionInfo) || extractBindingValue(raw.productionCompanyLabel) || "Independent Production";
  const ageRating = extractBindingValue(raw.ageRating) || extractBindingValue(raw.certification) || "NR";
  const overview = extractBindingValue(raw.overview) || extractBindingValue(raw.synopsis) || extractBindingValue(raw.description) || `${rawTitle || "Untitled"} (${releaseYear}) directed by ${director}.`;
  const genres = splitListField(raw.genres || raw.genre || raw.genreLabel);
  const cast = splitListField(raw.cast || raw.castMemberLabel || raw.actors);
  const tags = splitListField(raw.tags);
  const categories = splitListField(raw.categories || raw.category);
  const isWikidataRecord = Boolean(wikidataId || raw.itemLabel || raw.directorLabel || raw.metadataProvider === "wikidata");
  const metadataProvider = raw.metadataProvider || (isWikidataRecord ? "wikidata" : defaultSource);
  const movieId = extractBindingValue(raw.movieId) || (wikidataId ? `wikidata-${wikidataId.toLowerCase()}` : `local-${(rawTitle || "movie").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${releaseYear}`);
  const item = hydrateCatalogItemArtwork({
    movieId,
    wikidataId,
    metadataProvider,
    providerExternalId: wikidataId || movieId,
    providerAttribution: metadataProvider === "wikidata" ? `Wikidata Entity ${wikidataId || ""} \u2022 CC0 Public Domain`.trim() : "CineShelf Local JSON Movie Database",
    title: rawTitle || "Untitled Movie",
    originalTitle,
    contentType: extractBindingValue(raw.contentType) || "movie",
    releaseYear,
    language,
    country,
    director,
    productionInfo,
    ageRating,
    cast,
    genres: genres.length > 0 ? genres : ["Drama"],
    tags: tags.length > 0 ? tags : isWikidataRecord ? ["wikidata-import"] : ["local-catalogue"],
    categories: categories.length > 0 ? categories : ["featured"],
    runtimeMinutes,
    communityRating: Number(extractBindingValue(raw.communityRating)) || 7.9,
    popularityScore: Number(extractBindingValue(raw.popularityScore)) || 84,
    overview,
    posterUrl: extractBindingValue(raw.posterUrl),
    backdropUrl: extractBindingValue(raw.backdropUrl),
    trailerYoutubeUrl: extractBindingValue(raw.trailerYoutubeUrl) || void 0,
    addedAt: extractBindingValue(raw.addedAt) || (/* @__PURE__ */ new Date()).toISOString(),
    streamingByRegion: raw.streamingByRegion || {}
  });
  return {
    item,
    warnings,
    isValid: Boolean(rawTitle && rawTitle.trim().length > 0)
  };
}
function parseCsvRows(csvText) {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const parseLine = (line) => {
    const out = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const record = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] ?? "";
    });
    return record;
  });
}
function parseAndValidateCatalogueImport(rawText, existingCatalog, _formatHint) {
  const trimmed = (rawText || "").trim();
  if (!trimmed) {
    return {
      isValid: false,
      formatDetected: "cineshelf_json",
      validItems: [],
      parsedItems: [],
      previewItems: [],
      newCount: 0,
      newItemsCount: 0,
      duplicateCount: 0,
      duplicatesCount: 0,
      invalidCount: 0,
      errors: ["Input is empty. Paste valid JSON or CSV movie data."]
    };
  }
  let rawRecords = [];
  let formatDetected = "cineshelf_json";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawRecords = parsed;
        const looksLikeWikidata = rawRecords.some((r) => r && typeof r === "object" && ("itemLabel" in r || "wikidataId" in r || "item" in r));
        formatDetected = looksLikeWikidata ? "wikidata_json" : "cineshelf_json";
      } else if (parsed && typeof parsed === "object") {
        if (parsed.results && Array.isArray(parsed.results.bindings)) {
          rawRecords = parsed.results.bindings;
          formatDetected = "wikidata_json";
        } else if (Array.isArray(parsed.movies)) {
          rawRecords = parsed.movies;
          formatDetected = "cineshelf_json";
        } else if (Array.isArray(parsed.items)) {
          rawRecords = parsed.items;
          formatDetected = "wikidata_json";
        } else {
          rawRecords = [parsed];
        }
      }
    } catch (err) {
      return {
        isValid: false,
        formatDetected: "cineshelf_json",
        validItems: [],
        parsedItems: [],
        previewItems: [],
        newCount: 0,
        newItemsCount: 0,
        duplicateCount: 0,
        duplicatesCount: 0,
        invalidCount: 0,
        errors: [`Invalid JSON syntax: ${err instanceof Error ? err.message : "Unable to parse JSON"}`]
      };
    }
  } else {
    formatDetected = "csv";
    rawRecords = parseCsvRows(trimmed);
    if (rawRecords.length === 0) {
      return {
        isValid: false,
        formatDetected: "csv",
        validItems: [],
        parsedItems: [],
        previewItems: [],
        newCount: 0,
        newItemsCount: 0,
        duplicateCount: 0,
        duplicatesCount: 0,
        invalidCount: 0,
        errors: ["CSV must include a header row and at least one movie row."]
      };
    }
  }
  const previewItems = [];
  const validItems = [];
  let newCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;
  rawRecords.forEach((raw, idx) => {
    const defaultProvider = formatDetected === "wikidata_json" ? "wikidata" : "local_json";
    const { item, warnings, isValid } = mapRawRecordToCandidate(raw, idx, defaultProvider);
    if (!isValid) {
      invalidCount++;
      previewItems.push({
        item,
        status: "invalid",
        validationWarnings: warnings
      });
      return;
    }
    const existingMatch = existingCatalog.find(
      (ex) => ex.movieId === item.movieId || ex.wikidataId && item.wikidataId && ex.wikidataId.toUpperCase() === item.wikidataId.toUpperCase() || ex.title.toLowerCase() === item.title.toLowerCase() && ex.releaseYear === item.releaseYear
    );
    if (existingMatch) {
      duplicateCount++;
      const { merged, preservedFields } = mergeCatalogItemPreservingEdits(existingMatch, item);
      validItems.push(merged);
      previewItems.push({
        item: merged,
        status: "duplicate_merge",
        matchedExistingId: existingMatch.movieId,
        preservedManualFields: preservedFields,
        validationWarnings: warnings
      });
    } else {
      newCount++;
      validItems.push(item);
      previewItems.push({
        item,
        status: "new",
        validationWarnings: warnings
      });
    }
  });
  return {
    isValid: validItems.length > 0,
    formatDetected,
    validItems,
    parsedItems: validItems,
    previewItems,
    newCount,
    newItemsCount: newCount,
    duplicateCount,
    duplicatesCount: duplicateCount,
    invalidCount,
    errors: []
  };
}
var SAMPLE_WIKIDATA_IMPORT_JSON = JSON.stringify(
  {
    results: {
      bindings: [
        {
          item: { value: "http://www.wikidata.org/entity/Q237811" },
          itemLabel: { value: "3 Idiots" },
          originalTitle: { value: "3 \u0907\u0921\u093F\u092F\u091F\u094D\u0938" },
          publicationDate: { value: "2009-12-25T00:00:00Z" },
          directorLabel: { value: "Rajkumar Hirani" },
          castMemberLabel: { value: "Aamir Khan; R. Madhavan; Sharman Joshi; Kareena Kapoor; Boman Irani" },
          genreLabel: { value: "Drama; Comedy" },
          originalLanguageLabel: { value: "Hindi" },
          countryOfOriginLabel: { value: "India" },
          duration: { value: "170" },
          productionCompanyLabel: { value: "Vinod Chopra Films" },
          ageRating: { value: "UA" },
          description: {
            value: "Two friends embark on a quest for a lost companion, recalling their college days and the friend who inspired them to think differently."
          }
        },
        {
          item: { value: "http://www.wikidata.org/entity/Q157394" },
          itemLabel: { value: "Spirited Away" },
          originalTitle: { value: "\u5343\u3068\u5343\u5C0B\u306E\u795E\u96A0\u3057" },
          publicationDate: { value: "2001-07-20T00:00:00Z" },
          directorLabel: { value: "Hayao Miyazaki" },
          castMemberLabel: { value: "Rumi Hiiragi; Miyu Irino; Mari Natsuki" },
          genreLabel: { value: "Fantasy; Adventure; Animation" },
          originalLanguageLabel: { value: "Japanese" },
          countryOfOriginLabel: { value: "Japan" },
          duration: { value: "125" },
          productionCompanyLabel: { value: "Studio Ghibli" },
          ageRating: { value: "PG" },
          description: {
            value: "During her family\u2019s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits."
          }
        }
      ]
    }
  },
  null,
  2
);

// src/utils/socialEngine.ts
var INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function generateSecureInviteCode(length = 9) {
  const chars = [];
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * INVITE_ALPHABET.length);
    chars.push(INVITE_ALPHABET[idx]);
  }
  return chars.join("");
}
var THEATRE_SEAT_LAYOUT = (() => {
  const seats = [];
  const rows = [
    { label: "A", z: -4.2, y: 0.35 },
    { label: "B", z: -0.8, y: 0.85 },
    { label: "C", z: 2.6, y: 1.35 },
    { label: "D", z: 6, y: 1.85 }
  ];
  const xCoords = [-8.5, -6.7, -4.9, -1.8, 0, 1.8, 4.9, 6.7, 8.5];
  let idx = 0;
  for (const r of rows) {
    xCoords.forEach((x, sIdx) => {
      seats.push({
        seatIndex: idx++,
        rowLabel: r.label,
        seatNumber: sIdx + 1,
        x,
        y: r.y,
        z: r.z
      });
    });
  }
  return seats;
})();
var STYLES = [
  "modern_casual",
  "cartoon_stylised",
  "stylised_game",
  "futuristic_cyber",
  "classic_cinema"
];
var HAIRS = [
  "short_crop",
  "wavy_part",
  "cyber_undercut",
  "bun_classic",
  "spiky"
];
var OUTFITS = [
  "hoodie_denim",
  "tuxedo_velvet",
  "neon_jacket",
  "retro_varsity",
  "vip_blazer"
];
var ACCESSORIES = [
  "none",
  "3d_glasses",
  "cinema_beret",
  "gold_headset",
  "visor"
];
var PRIMARY_PALETTE = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#EF4444",
  "#14B8A6"
];
var SECONDARY_PALETTE = [
  "#1E293B",
  "#0F172A",
  "#312E81",
  "#3F3F46",
  "#1F2937",
  "#27272A"
];
function generateDefaultAppearanceForUid(uid, displayName) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return {
    style: STYLES[h % STYLES.length],
    hairStyle: HAIRS[(h >>> 3) % HAIRS.length],
    outfit: OUTFITS[(h >>> 6) % OUTFITS.length],
    primaryColor: PRIMARY_PALETTE[(h >>> 9) % PRIMARY_PALETTE.length],
    secondaryColor: SECONDARY_PALETTE[(h >>> 12) % SECONDARY_PALETTE.length],
    accessory: ACCESSORIES[(h >>> 15) % ACCESSORIES.length],
    displayName: displayName || "Cinephile"
  };
}
var THEATRE_BOUNDS = {
  minX: -13,
  maxX: 13,
  minZ: -10.8,
  // In front of raised screen stage
  maxZ: 14.8
  // Rear lobby wall
};
var THEATRE_OBSTACLE_BOXES = [
  // Left Popcorn & Nachos Counter
  { name: "popcorn_counter", minX: -10.2, maxX: -3.4, minZ: 11.8, maxZ: 14.9 },
  // Right Cold-Drinks Fountain Counter
  { name: "drinks_counter", minX: 3.4, maxX: 10.2, minZ: 11.8, maxZ: 14.9 }
];
function getFloorElevationAtZ(z) {
  if (z <= -5) return 0;
  if (z >= 8) return 1.9;
  const t = (z - -5) / (8 - -5);
  return Number((t * 1.9).toFixed(3));
}
function resolveTheatreMovement(currentPos, targetPos, otherParticipants, selfUid) {
  let x = targetPos.x;
  let z = targetPos.z;
  let collided = false;
  if (x < THEATRE_BOUNDS.minX) {
    x = THEATRE_BOUNDS.minX;
    collided = true;
  } else if (x > THEATRE_BOUNDS.maxX) {
    x = THEATRE_BOUNDS.maxX;
    collided = true;
  }
  if (z < THEATRE_BOUNDS.minZ) {
    z = THEATRE_BOUNDS.minZ;
    collided = true;
  } else if (z > THEATRE_BOUNDS.maxZ) {
    z = THEATRE_BOUNDS.maxZ;
    collided = true;
  }
  const radius = 0.45;
  for (const box of THEATRE_OBSTACLE_BOXES) {
    if (x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ) {
      collided = true;
      const overlapLeft = x + radius - box.minX;
      const overlapRight = box.maxX - (x - radius);
      const overlapFront = z + radius - box.minZ;
      const overlapBack = box.maxZ - (z - radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapFront, overlapBack);
      if (minOverlap === overlapFront) z = box.minZ - radius;
      else if (minOverlap === overlapBack) z = box.maxZ + radius;
      else if (minOverlap === overlapLeft) x = box.minX - radius;
      else x = box.maxX + radius;
    }
  }
  for (const seat of THEATRE_SEAT_LAYOUT) {
    const dx = x - seat.x;
    const dz = z - seat.z;
    const distSq = dx * dx + dz * dz;
    const minSeatDist = 0.58;
    if (distSq < minSeatDist * minSeatDist && distSq > 1e-4) {
      const dist = Math.sqrt(distSq);
      const push = (minSeatDist - dist) / dist;
      x += dx * push;
      z += dz * push;
      collided = true;
    }
  }
  const minPlayerSeparation = 0.65;
  for (const other of otherParticipants) {
    if (other.uid === selfUid || other.seatIndex !== null) continue;
    const dx = x - other.position.x;
    const dz = z - other.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < minPlayerSeparation * minPlayerSeparation) {
      if (distSq < 1e-4) {
        x += 0.65;
      } else {
        const dist = Math.sqrt(distSq);
        const push = (minPlayerSeparation - dist) / dist;
        x += dx * push;
        z += dz * push;
      }
      collided = true;
    }
  }
  x = Math.max(THEATRE_BOUNDS.minX, Math.min(THEATRE_BOUNDS.maxX, x));
  z = Math.max(THEATRE_BOUNDS.minZ, Math.min(THEATRE_BOUNDS.maxZ, z));
  const y = getFloorElevationAtZ(z);
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: Number(z.toFixed(3)),
    collidedWithWallOrCounter: collided
  };
}
var CURATED_DIRECT_CINEMA_STREAMS = [
  {
    id: "blender-tears-of-steel",
    title: "Tears of Steel (Open Sci-Fi Cinema Showcase \xB7 734s)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    sourceType: "direct_video",
    providerName: "Direct HTTPS MP4 (CORS Authorised)",
    isAuthorized: true,
    supportsAutoSync: true,
    compatibilityMessage: "Verified direct HTTPS MP4 stream with WebGL VideoTexture & sub-second timeline sync.",
    subtitleTrackLabel: "English (CC)"
  },
  {
    id: "blender-sintel",
    title: "Sintel (Open Fantasy Featurette \xB7 888s)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    sourceType: "direct_video",
    providerName: "Direct HTTPS MP4 (CORS Authorised)",
    isAuthorized: true,
    supportsAutoSync: true,
    compatibilityMessage: "Verified direct HTTPS MP4 stream with WebGL VideoTexture & sub-second timeline sync.",
    subtitleTrackLabel: "English (CC)"
  },
  {
    id: "blender-big-buck-bunny",
    title: "Big Buck Bunny (Open Animated Short \xB7 596s)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    sourceType: "direct_video",
    providerName: "Direct HTTPS MP4 (CORS Authorised)",
    isAuthorized: true,
    supportsAutoSync: true,
    compatibilityMessage: "Verified direct HTTPS MP4 stream with WebGL VideoTexture & sub-second timeline sync."
  }
];
var OFFICIAL_EMBED_ALLOWLIST = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com"
];
var KNOWN_UNSUPPORTED_STREAMING_DOMAINS = [
  "bingr.one",
  "www.bingr.one",
  "cinejoy",
  "cinejoy.to",
  "fmovies",
  "soap2day",
  "123movies",
  "netflix.com",
  "www.netflix.com",
  "primevideo.com",
  "www.primevideo.com",
  "hotstar.com",
  "www.hotstar.com"
];
function validateAndClassifyMediaSource(rawUrl, customTitle) {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    return CURATED_DIRECT_CINEMA_STREAMS[0];
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      id: `invalid-${Date.now()}`,
      url: trimmed,
      title: customTitle || "Invalid URL",
      sourceType: "unsupported_webpage",
      providerName: "Unverified URL",
      isAuthorized: false,
      supportsAutoSync: false,
      manualCountdownFallbackOnly: true,
      compatibilityMessage: "This website does not support integrated playback or synchronised controls in NEXUS. Please enter a valid HTTPS media URL."
    };
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    return {
      id: `insecure-${Date.now()}`,
      url: trimmed,
      title: customTitle || parsed.hostname,
      sourceType: "unsupported_webpage",
      providerName: parsed.hostname,
      isAuthorized: false,
      supportsAutoSync: false,
      manualCountdownFallbackOnly: true,
      compatibilityMessage: "This website does not support integrated playback or synchronised controls in NEXUS. Only secure HTTPS sources are permitted."
    };
  }
  const host = parsed.hostname.toLowerCase();
  const pathLower = parsed.pathname.toLowerCase();
  if (KNOWN_UNSUPPORTED_STREAMING_DOMAINS.some(
    (d) => host === d || host.endsWith(`.${d}`) || host.includes("bingr") || host.includes("cinejoy")
  )) {
    return {
      id: `unsupported-${Date.now()}`,
      url: trimmed,
      title: customTitle || `External Webpage (${host})`,
      sourceType: "unsupported_webpage",
      providerName: host,
      isAuthorized: false,
      supportsAutoSync: false,
      manualCountdownFallbackOnly: true,
      compatibilityMessage: "This website does not support integrated playback or synchronised controls in NEXUS."
    };
  }
  if (pathLower.endsWith(".mp4") || pathLower.endsWith(".webm") || pathLower.endsWith(".ogg") || pathLower.endsWith(".mov")) {
    return {
      id: `direct-${Date.now()}`,
      url: trimmed,
      title: customTitle || parsed.pathname.split("/").pop() || "Direct HTTPS Video",
      sourceType: "direct_video",
      providerName: `Direct HTTPS Media (${host})`,
      isAuthorized: true,
      supportsAutoSync: true,
      compatibilityMessage: "Direct HTTPS media stream verified. Supports 3D screen VideoTexture projection and authoritative timeline sync."
    };
  }
  if (pathLower.endsWith(".m3u8")) {
    return {
      id: `hls-${Date.now()}`,
      url: trimmed,
      title: customTitle || "HLS Adaptive Stream",
      sourceType: "hls_stream",
      providerName: `HLS Stream (${host})`,
      isAuthorized: true,
      supportsAutoSync: true,
      compatibilityMessage: "HLS (.m3u8) adaptive stream verified via hls.js adapter with authoritative timeline sync."
    };
  }
  if (OFFICIAL_EMBED_ALLOWLIST.includes(host)) {
    return {
      id: `embed-${Date.now()}`,
      url: trimmed,
      title: customTitle || `Official Embed (${host})`,
      sourceType: "official_embed",
      providerName: `Official Embed Adapter (${host})`,
      isAuthorized: true,
      supportsAutoSync: true,
      compatibilityMessage: `Official embeddable player (${host}) verified against allowlist.`
    };
  }
  return {
    id: `webpage-${Date.now()}`,
    url: trimmed,
    title: customTitle || `External Webpage (${host})`,
    sourceType: "unsupported_webpage",
    providerName: host,
    isAuthorized: false,
    supportsAutoSync: false,
    manualCountdownFallbackOnly: true,
    compatibilityMessage: "This website does not support integrated playback or synchronised controls in NEXUS."
  };
}
function computeAuthoritativePlaybackPosition(room, nowMs = Date.now()) {
  const pb = room.playback;
  if (!pb.isPlaying) {
    return pb.positionSeconds;
  }
  const elapsedSec = Math.max(0, (nowMs - pb.lastSyncServerTimestampMs) / 1e3);
  const pos = pb.positionSeconds + elapsedSec;
  if (pb.durationSeconds > 0 && pos >= pb.durationSeconds) {
    return pb.durationSeconds;
  }
  return Number(pos.toFixed(3));
}
var SocialCinemaServerManager = class {
  constructor() {
    this.rooms = /* @__PURE__ */ new Map();
    this.inviteIndex = /* @__PURE__ */ new Map();
    // inviteCode -> roomId
    this.joinAttemptTracker = /* @__PURE__ */ new Map();
  }
  createRoom(params) {
    const {
      hostUid,
      hostName,
      roomName,
      roomMode = "friends",
      theme = "classic_cinema",
      capacity = 35,
      appearance,
      inviteTtlMs = 1e3 * 60 * 60 * 6
      // 6 hours default
    } = params;
    if (!hostUid || !hostUid.trim()) {
      throw new Error("AUTH_REQUIRED: Authenticated UID required to create a room.");
    }
    const validCapacities = [20, 25, 30, 35];
    const safeCapacity = validCapacities.includes(capacity) ? capacity : 35;
    const nowMs = Date.now();
    const roomId = `room_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    let inviteCode = generateSecureInviteCode(9);
    while (this.inviteIndex.has(inviteCode)) {
      inviteCode = generateSecureInviteCode(9);
    }
    const hostAppearance = appearance || generateDefaultAppearanceForUid(hostUid, hostName);
    const initialSpawn = resolveTheatreMovement(
      { x: 0, y: 1.9, z: 8.8 },
      { x: 0, z: 8.8 },
      [],
      hostUid
    );
    const hostParticipant = {
      uid: hostUid,
      displayName: hostName || hostAppearance.displayName,
      role: "host",
      appearance: hostAppearance,
      position: { x: initialSpawn.x, y: initialSpawn.y, z: initialSpawn.z },
      rotationY: Math.PI,
      // Facing toward the front screen (-Z)
      animation: "idle",
      holdingItem: "none",
      itemPortionsRemaining: 0,
      seatIndex: null,
      activeEmote: null,
      emoteExpiresAtMs: null,
      isMuted: true,
      // Voice disabled by default until user explicitly enables it
      isHostMuted: false,
      isSpeaking: false,
      voiceMode: "off",
      isBuffering: false,
      joinedAtMs: nowMs,
      lastHeartbeatMs: nowMs
    };
    const participantsMap = {
      [hostUid]: hostParticipant
    };
    if (roomMode === "bot_sandbox") {
      const botProfiles = [
        { uid: "bot_aria", name: "AI Bot \xB7 Aria", seatIdx: 12, item: "popcorn_butter" },
        { uid: "bot_kabir", name: "AI Bot \xB7 Kabir", seatIdx: 14, item: "drink_cola" },
        { uid: "bot_nova", name: "AI Bot \xB7 Nova", seatIdx: 22, item: "popcorn_caramel" },
        { uid: "bot_zane", name: "AI Bot \xB7 Zane", seatIdx: null, item: "none" }
      ];
      for (const b of botProfiles) {
        const botApp = generateDefaultAppearanceForUid(b.uid, b.name);
        const seatSpec = b.seatIdx !== null ? THEATRE_SEAT_LAYOUT[b.seatIdx] : null;
        participantsMap[b.uid] = {
          uid: b.uid,
          displayName: b.name,
          role: "member",
          appearance: botApp,
          position: seatSpec ? { x: seatSpec.x, y: seatSpec.y, z: seatSpec.z } : { x: -4.2, y: 1.9, z: 10.4 },
          rotationY: seatSpec ? 0 : Math.PI,
          animation: seatSpec ? "sitting" : "idle",
          holdingItem: b.item,
          itemPortionsRemaining: b.item === "none" ? 0 : 5,
          seatIndex: b.seatIdx,
          activeEmote: null,
          emoteExpiresAtMs: null,
          isMuted: true,
          isHostMuted: false,
          isSpeaking: false,
          voiceMode: "off",
          isBuffering: false,
          isBot: true,
          joinedAtMs: nowMs,
          lastHeartbeatMs: nowMs
        };
      }
    }
    const room = {
      roomId,
      roomName: (roomName || `${hostName}'s Private 3D Cinema`).slice(0, 80),
      roomMode,
      hostUid,
      hostName,
      theme,
      capacity: safeCapacity,
      isPrivate: true,
      isLocked: false,
      chatRestricted: false,
      isClosed: false,
      inviteCode,
      inviteExpiresAtMs: nowMs + inviteTtlMs,
      inviteRevoked: false,
      playback: {
        mediaSource: CURATED_DIRECT_CINEMA_STREAMS[0],
        isPlaying: false,
        positionSeconds: 0,
        durationSeconds: 734,
        lastSyncServerTimestampMs: nowMs,
        revision: 1,
        hostUid,
        coHostUids: [],
        controlsLocked: true,
        subtitleTrack: "English (CC)",
        manualCountdownStartedAtMs: null,
        controlRequests: []
      },
      participants: participantsMap,
      messages: [
        {
          id: `msg_welcome_${nowMs}`,
          roomId,
          uid: hostUid,
          displayName: hostName,
          avatarColor: hostAppearance.primaryColor,
          text: roomMode === "bot_sandbox" ? `Welcome to ${roomName || "NEXUS 3D Bot Sandbox"}! AI Bots are in the theatre\u2014test movement, snacks, seats, or spawn up to 35 bots. Log in anytime to invite real friends.` : `Welcome to ${roomName || "NEXUS SOCIAL 3D Cinema"}! Grab popcorn or a cold drink at the rear counter and pick a seat.`,
          isNearbyOnly: false,
          senderPosition: { x: initialSpawn.x, y: initialSpawn.y, z: initialSpawn.z },
          reactions: {},
          createdAtMs: nowMs
        }
      ],
      createdAtMs: nowMs,
      updatedAtMs: nowMs
    };
    this.rooms.set(roomId, room);
    this.inviteIndex.set(inviteCode, roomId);
    return room;
  }
  /**
   * Seamlessly transitions a Guest's active 3D room into a Friend-Mode multiplayer room
   * without resetting their position, held refreshments, seat, or playback timeline.
   */
  upgradeBotRoomToFriendsRoom(params) {
    const { roomId, previousHostUid, newHostUid, newHostName } = params;
    const room = this.rooms.get(roomId);
    if (!room || room.isClosed) {
      throw new Error("ROOM_NOT_FOUND: Room does not exist.");
    }
    const effectiveOldUid = previousHostUid && room.participants[previousHostUid] ? previousHostUid : room.hostUid;
    if (effectiveOldUid !== room.hostUid && newHostUid !== room.hostUid) {
      throw new Error("HOST_ONLY: Only the room host can upgrade this session to Friend Mode.");
    }
    const existingHostParticipant = room.participants[effectiveOldUid];
    if (existingHostParticipant && effectiveOldUid !== newHostUid) {
      delete room.participants[effectiveOldUid];
      existingHostParticipant.uid = newHostUid;
      existingHostParticipant.displayName = newHostName || existingHostParticipant.displayName;
      existingHostParticipant.appearance = {
        ...existingHostParticipant.appearance,
        displayName: newHostName || existingHostParticipant.displayName
      };
      room.participants[newHostUid] = existingHostParticipant;
    } else if (room.participants[newHostUid]) {
      room.participants[newHostUid].displayName = newHostName || room.participants[newHostUid].displayName;
    }
    room.hostUid = newHostUid;
    room.hostName = newHostName || room.hostName;
    room.playback.hostUid = newHostUid;
    room.roomMode = "friends";
    room.updatedAtMs = Date.now();
    return room;
  }
  recordJoinAttemptAndCheckRateLimit(uidOrKey, nowMs) {
    const entry = this.joinAttemptTracker.get(uidOrKey);
    if (!entry || nowMs - entry.windowStartMs > 6e4) {
      this.joinAttemptTracker.set(uidOrKey, { count: 1, windowStartMs: nowMs });
      return;
    }
    if (entry.count >= 8) {
      throw new Error("RATE_LIMITED: Too many unsuccessful join attempts. Please wait 60 seconds.");
    }
  }
  incrementFailedJoinAttempt(uidOrKey, nowMs) {
    const entry = this.joinAttemptTracker.get(uidOrKey);
    if (!entry || nowMs - entry.windowStartMs > 6e4) {
      this.joinAttemptTracker.set(uidOrKey, { count: 1, windowStartMs: nowMs });
    } else {
      entry.count += 1;
    }
  }
  joinRoomByInviteCode(params) {
    const { uid, displayName, inviteCode, appearance, nowMs = Date.now() } = params;
    if (!uid || !uid.trim()) {
      throw new Error("AUTH_REQUIRED: Only authenticated CineShelf users may join a room.");
    }
    this.recordJoinAttemptAndCheckRateLimit(uid, nowMs);
    const normalizedCode = (inviteCode || "").trim().toUpperCase();
    const roomId = this.inviteIndex.get(normalizedCode);
    if (!roomId) {
      this.incrementFailedJoinAttempt(uid, nowMs);
      throw new Error("INVALID_INVITE: Invitation code not found or no longer active.");
    }
    const room = this.rooms.get(roomId);
    if (!room || room.isClosed) {
      this.incrementFailedJoinAttempt(uid, nowMs);
      throw new Error("ROOM_CLOSED: This cinema session has ended.");
    }
    if (room.inviteRevoked) {
      this.incrementFailedJoinAttempt(uid, nowMs);
      throw new Error("INVITE_REVOKED: The host has revoked this invitation code.");
    }
    if (nowMs > room.inviteExpiresAtMs) {
      this.incrementFailedJoinAttempt(uid, nowMs);
      throw new Error("INVITE_EXPIRED: This invitation code has expired.");
    }
    if (room.participants[uid]) {
      room.participants[uid].lastHeartbeatMs = nowMs;
      if (appearance) {
        room.participants[uid].appearance = appearance;
      }
      room.playback.positionSeconds = computeAuthoritativePlaybackPosition(room, nowMs);
      room.playback.lastSyncServerTimestampMs = nowMs;
      room.updatedAtMs = nowMs;
      return room;
    }
    if (room.isLocked) {
      throw new Error("ROOM_LOCKED: The host has locked this theatre to new entrants.");
    }
    const currentCount = Object.keys(room.participants).length;
    const effectiveLimit = Math.min(room.capacity, 35);
    if (currentCount >= effectiveLimit) {
      throw new Error(
        `ROOM_CAPACITY_FULL: Room has reached its maximum capacity of ${effectiveLimit} participants.`
      );
    }
    const memberAppearance = appearance || generateDefaultAppearanceForUid(uid, displayName);
    const offsetIndex = currentCount;
    const spawnCandidateX = (offsetIndex % 7 - 3) * 0.85;
    const spawnCandidateZ = 9.2 + Math.floor(offsetIndex / 7) * 0.75;
    const resolvedPos = resolveTheatreMovement(
      { x: 0, y: 1.9, z: 10 },
      { x: spawnCandidateX, z: Math.min(14.2, spawnCandidateZ) },
      Object.values(room.participants),
      uid
    );
    room.participants[uid] = {
      uid,
      displayName: displayName || memberAppearance.displayName,
      role: "member",
      appearance: memberAppearance,
      position: { x: resolvedPos.x, y: resolvedPos.y, z: resolvedPos.z },
      rotationY: Math.PI,
      animation: "idle",
      holdingItem: "none",
      itemPortionsRemaining: 0,
      seatIndex: null,
      activeEmote: null,
      emoteExpiresAtMs: null,
      isMuted: true,
      isHostMuted: false,
      isSpeaking: false,
      voiceMode: "off",
      isBuffering: false,
      joinedAtMs: nowMs,
      lastHeartbeatMs: nowMs
    };
    room.playback.positionSeconds = computeAuthoritativePlaybackPosition(room, nowMs);
    room.playback.lastSyncServerTimestampMs = nowMs;
    room.updatedAtMs = nowMs;
    return room;
  }
  getRoomForMember(roomId, uid) {
    if (!uid) {
      throw new Error("AUTH_REQUIRED: Authentication required.");
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("ROOM_NOT_FOUND: Room does not exist.");
    }
    if (!room.participants[uid]) {
      throw new Error("NOT_A_MEMBER: Access denied. You are not a member of this private room.");
    }
    const nowMs = Date.now();
    room.playback.positionSeconds = computeAuthoritativePlaybackPosition(room, nowMs);
    room.playback.lastSyncServerTimestampMs = nowMs;
    return room;
  }
  updateParticipantMovement(params) {
    const { roomId, authenticatedUid, targetUid, x, y, z, rotationY, animation } = params;
    if (targetUid && targetUid !== authenticatedUid) {
      throw new Error("FORBIDDEN_AVATAR_CONTROL: Cannot control another participant avatar.");
    }
    const room = this.getRoomForMember(roomId, authenticatedUid);
    const participant = room.participants[authenticatedUid];
    participant.seatIndex = null;
    const resolved = resolveTheatreMovement(
      participant.position,
      { x, z },
      Object.values(room.participants),
      authenticatedUid
    );
    const resolvedY = typeof y === "number" && Number.isFinite(y) ? Math.max(resolved.y, Math.min(resolved.y + 2.5, Number(y.toFixed(3)))) : resolved.y;
    participant.position = { x: resolved.x, y: resolvedY, z: resolved.z };
    participant.rotationY = Number(rotationY.toFixed(3));
    if (animation) {
      participant.animation = animation;
    } else if (participant.holdingItem.startsWith("popcorn")) {
      participant.animation = "holding_popcorn";
    } else if (participant.holdingItem.startsWith("drink")) {
      participant.animation = "holding_drink";
    } else {
      participant.animation = "walking";
    }
    participant.lastHeartbeatMs = Date.now();
    room.updatedAtMs = participant.lastHeartbeatMs;
    return { participant, collided: resolved.collidedWithWallOrCounter };
  }
  interactWithRefreshment(params) {
    const { roomId, uid, action, itemVariant } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    switch (action) {
      case "pickup_popcorn": {
        p.holdingItem = itemVariant && itemVariant.startsWith("popcorn_") ? itemVariant : "popcorn_butter";
        p.itemPortionsRemaining = 5;
        p.animation = "holding_popcorn";
        break;
      }
      case "eat_popcorn": {
        if (!p.holdingItem.startsWith("popcorn_")) {
          p.holdingItem = "popcorn_butter";
          p.itemPortionsRemaining = 5;
        }
        p.itemPortionsRemaining = Math.max(0, p.itemPortionsRemaining - 1);
        p.animation = "eating_popcorn";
        break;
      }
      case "pickup_drink": {
        p.holdingItem = itemVariant && itemVariant.startsWith("drink_") ? itemVariant : "drink_cola";
        p.itemPortionsRemaining = 5;
        p.animation = "holding_drink";
        break;
      }
      case "drink_beverage": {
        if (!p.holdingItem.startsWith("drink_")) {
          p.holdingItem = "drink_cola";
          p.itemPortionsRemaining = 5;
        }
        p.itemPortionsRemaining = Math.max(0, p.itemPortionsRemaining - 1);
        p.animation = "drinking";
        break;
      }
      case "refill": {
        if (p.holdingItem !== "none") {
          p.itemPortionsRemaining = 5;
        }
        break;
      }
      case "put_away": {
        p.holdingItem = "none";
        p.itemPortionsRemaining = 0;
        p.animation = p.seatIndex !== null ? "sitting" : "idle";
        break;
      }
    }
    p.lastHeartbeatMs = Date.now();
    room.updatedAtMs = p.lastHeartbeatMs;
    return p;
  }
  toggleSeat(params) {
    const { roomId, uid, requestedSeatIndex } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    if (p.seatIndex !== null && requestedSeatIndex === void 0) {
      p.seatIndex = null;
      p.position.z = Math.min(THEATRE_BOUNDS.maxZ, p.position.z + 0.65);
      p.position.y = getFloorElevationAtZ(p.position.z);
      p.animation = "standing";
      return p;
    }
    const occupiedSeats = new Set(
      Object.values(room.participants).filter((other) => other.uid !== uid && other.seatIndex !== null).map((other) => other.seatIndex)
    );
    let chosenSeat;
    if (typeof requestedSeatIndex === "number" && !occupiedSeats.has(requestedSeatIndex)) {
      chosenSeat = THEATRE_SEAT_LAYOUT.find((s) => s.seatIndex === requestedSeatIndex);
    }
    if (!chosenSeat) {
      let bestDistSq = Infinity;
      for (const s of THEATRE_SEAT_LAYOUT) {
        if (occupiedSeats.has(s.seatIndex)) continue;
        const dx = p.position.x - s.x;
        const dz = p.position.z - s.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          chosenSeat = s;
        }
      }
    }
    if (chosenSeat) {
      p.seatIndex = chosenSeat.seatIndex;
      p.position = { x: chosenSeat.x, y: chosenSeat.y, z: chosenSeat.z };
      p.rotationY = 0;
      p.animation = "sitting";
    }
    p.lastHeartbeatMs = Date.now();
    room.updatedAtMs = p.lastHeartbeatMs;
    return p;
  }
  triggerEmote(params) {
    const { roomId, uid, emote } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    const nowMs = Date.now();
    p.activeEmote = emote;
    p.emoteExpiresAtMs = nowMs + 4e3;
    if (emote === "wave") p.animation = "wave";
    else if (emote === "laugh") p.animation = "laughing";
    else if (emote === "cheer" || emote === "applause" || emote === "dancing") {
      p.animation = "celebrating";
    }
    p.lastHeartbeatMs = nowMs;
    room.updatedAtMs = nowMs;
    return p;
  }
  sendChatMessage(params) {
    const { roomId, uid, text, isNearbyOnly = false } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    if (p.isHostMuted) {
      throw new Error("MUTED_BY_HOST: You have been muted by the room host.");
    }
    if (room.chatRestricted && p.role === "member") {
      throw new Error("CHAT_RESTRICTED: Chat is currently restricted to Host and Co-Hosts.");
    }
    const cleanText = (text || "").trim().slice(0, 500);
    if (!cleanText) {
      throw new Error("EMPTY_MESSAGE: Message cannot be empty.");
    }
    const nowMs = Date.now();
    const msg = {
      id: `msg_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      roomId,
      uid,
      displayName: p.displayName,
      avatarColor: p.appearance.primaryColor,
      text: cleanText,
      isNearbyOnly,
      senderPosition: { ...p.position },
      reactions: {},
      createdAtMs: nowMs
    };
    room.messages.push(msg);
    if (room.messages.length > 150) {
      room.messages.shift();
    }
    room.updatedAtMs = nowMs;
    return msg;
  }
  controlPlayback(params) {
    const {
      roomId,
      uid,
      action,
      positionSeconds,
      durationSeconds,
      sourceUrl,
      sourceTitle,
      nowMs = Date.now()
    } = params;
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    const pb = room.playback;
    if (action === "request_control") {
      if (!pb.controlRequests.some((r) => r.uid === uid)) {
        pb.controlRequests.push({
          uid,
          displayName: p.displayName,
          requestedAtMs: nowMs
        });
      }
      return pb;
    }
    const hasAuthority = p.role === "host" || p.role === "co_host" || !pb.controlsLocked;
    if (!hasAuthority) {
      throw new Error(
        "UNAUTHORIZED_PLAYBACK_CONTROL: Only the Host or Co-Host may control shared playback while controls are locked."
      );
    }
    const currentPos = computeAuthoritativePlaybackPosition(room, nowMs);
    switch (action) {
      case "play": {
        pb.positionSeconds = typeof positionSeconds === "number" ? Math.max(0, positionSeconds) : currentPos;
        pb.isPlaying = true;
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case "pause": {
        pb.positionSeconds = typeof positionSeconds === "number" ? Math.max(0, positionSeconds) : currentPos;
        pb.isPlaying = false;
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case "seek": {
        pb.positionSeconds = Math.max(0, Number(positionSeconds || 0));
        if (typeof durationSeconds === "number" && durationSeconds > 0) {
          pb.durationSeconds = durationSeconds;
        }
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case "set_source": {
        const validated = validateAndClassifyMediaSource(sourceUrl || "", sourceTitle);
        pb.mediaSource = validated;
        if (validated.supportsAutoSync) {
          pb.positionSeconds = 0;
          pb.isPlaying = false;
        }
        pb.lastSyncServerTimestampMs = nowMs;
        pb.revision += 1;
        break;
      }
      case "lock_controls": {
        if (p.role !== "host") {
          throw new Error("HOST_ONLY: Only the room host can lock playback controls.");
        }
        pb.controlsLocked = true;
        pb.revision += 1;
        break;
      }
      case "unlock_controls": {
        if (p.role !== "host") {
          throw new Error("HOST_ONLY: Only the room host can unlock playback controls.");
        }
        pb.controlsLocked = false;
        pb.revision += 1;
        break;
      }
      case "start_manual_countdown": {
        pb.manualCountdownStartedAtMs = nowMs;
        pb.revision += 1;
        break;
      }
    }
    room.updatedAtMs = nowMs;
    return pb;
  }
  reportBufferingState(roomId, uid, isBuffering) {
    const room = this.getRoomForMember(roomId, uid);
    const p = room.participants[uid];
    p.isBuffering = isBuffering;
    p.lastHeartbeatMs = Date.now();
    return p;
  }
  transferHost(params) {
    const { roomId, currentHostUid, newHostUid } = params;
    const room = this.getRoomForMember(roomId, currentHostUid);
    if (room.hostUid !== currentHostUid) {
      throw new Error("HOST_ONLY: Only the current host can transfer hosting privileges.");
    }
    const target = room.participants[newHostUid];
    if (!target) {
      throw new Error("TARGET_NOT_FOUND: Target participant is not in the room.");
    }
    room.participants[currentHostUid].role = "co_host";
    target.role = "host";
    room.hostUid = newHostUid;
    room.hostName = target.displayName;
    room.playback.hostUid = newHostUid;
    room.playback.revision += 1;
    room.updatedAtMs = Date.now();
    return room;
  }
  promoteCoHost(params) {
    const { roomId, hostUid, targetUid, makeCoHost } = params;
    const room = this.getRoomForMember(roomId, hostUid);
    if (room.hostUid !== hostUid) {
      throw new Error("HOST_ONLY: Only the host can assign co-host privileges.");
    }
    const target = room.participants[targetUid];
    if (!target || targetUid === hostUid) return room;
    target.role = makeCoHost ? "co_host" : "member";
    if (makeCoHost && !room.playback.coHostUids.includes(targetUid)) {
      room.playback.coHostUids.push(targetUid);
    } else if (!makeCoHost) {
      room.playback.coHostUids = room.playback.coHostUids.filter((id) => id !== targetUid);
    }
    room.updatedAtMs = Date.now();
    return room;
  }
  regenerateInviteCode(roomId, hostUid, ttlMs = 1e3 * 60 * 60 * 6) {
    const room = this.getRoomForMember(roomId, hostUid);
    if (room.hostUid !== hostUid) {
      throw new Error("HOST_ONLY: Only the host can regenerate invitation codes.");
    }
    this.inviteIndex.delete(room.inviteCode);
    let nextCode = generateSecureInviteCode(9);
    while (this.inviteIndex.has(nextCode)) {
      nextCode = generateSecureInviteCode(9);
    }
    room.inviteCode = nextCode;
    room.inviteExpiresAtMs = Date.now() + ttlMs;
    room.inviteRevoked = false;
    this.inviteIndex.set(nextCode, roomId);
    return nextCode;
  }
  revokeInviteCode(roomId, hostUid) {
    const room = this.getRoomForMember(roomId, hostUid);
    if (room.hostUid !== hostUid) {
      throw new Error("HOST_ONLY: Only the host can revoke invitations.");
    }
    room.inviteRevoked = true;
  }
  leaveRoom(roomId, uid) {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants[uid]) {
      return { roomClosed: false };
    }
    const wasHost = room.hostUid === uid;
    const nowMs = Date.now();
    room.playback.positionSeconds = computeAuthoritativePlaybackPosition(room, nowMs);
    room.playback.lastSyncServerTimestampMs = nowMs;
    delete room.participants[uid];
    const remaining = Object.values(room.participants);
    if (remaining.length === 0) {
      return { roomClosed: false };
    }
    if (wasHost) {
      const nextHost = remaining.find((m) => m.role === "co_host") || remaining.sort((a, b) => a.joinedAtMs - b.joinedAtMs)[0];
      if (nextHost) {
        nextHost.role = "host";
        room.hostUid = nextHost.uid;
        room.hostName = nextHost.displayName;
        room.playback.hostUid = nextHost.uid;
        return { roomClosed: false, promotedHostUid: nextHost.uid };
      }
    }
    return { roomClosed: false };
  }
  closeRoom(roomId, hostUid) {
    const room = this.getRoomForMember(roomId, hostUid);
    if (room.hostUid !== hostUid) {
      throw new Error("HOST_ONLY: Only the host can close the room.");
    }
    room.isClosed = true;
    room.playback.isPlaying = false;
    this.inviteIndex.delete(room.inviteCode);
  }
};

// src/utils/tempAuthEngine.ts
import crypto from "crypto";
var SAFE_ALPHANUM = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
var SAFE_DIGITS = "23456789";
function randomChars(alphabet, length) {
  const bytes = crypto.randomBytes(length);
  const out = [];
  for (let i = 0; i < length; i++) {
    out.push(alphabet[bytes[i] % alphabet.length]);
  }
  return out.join("");
}
function hashLoginCode(loginCode, salt) {
  const normalized = loginCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return crypto.createHash("sha256").update(`${salt}:${normalized}`).digest("hex");
}
function normalizeLoginId(raw) {
  const cleaned = String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const withoutPrefix = cleaned.startsWith("NXID") ? cleaned.slice(4) : cleaned;
  if (withoutPrefix.length === 8) {
    return `NXID-${withoutPrefix.slice(0, 4)}-${withoutPrefix.slice(4, 8)}`;
  }
  return String(raw || "").trim().toUpperCase();
}
function normalizeLoginCode(raw) {
  const cleaned = String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  }
  return String(raw || "").trim().toUpperCase();
}
var TemporaryAuthServerManager = class {
  constructor() {
    this.accountsByLoginId = /* @__PURE__ */ new Map();
    this.accountsByUid = /* @__PURE__ */ new Map();
    this.sessionsByToken = /* @__PURE__ */ new Map();
    this.activeGuestIds = /* @__PURE__ */ new Set();
    this.loginAttempts = /* @__PURE__ */ new Map();
  }
  /**
   * Creates an instant, frictionless temporary Guest Session with a unique Guest ID.
   */
  createGuestSession(params) {
    const nowMs = params?.nowMs ?? Date.now();
    const timeoutMins = Math.min(
      180,
      Math.max(1, Number(params?.inactivityTimeoutMinutes ?? 30))
    );
    const inactivityTimeoutMs = timeoutMins * 60 * 1e3;
    let shortCode = randomChars(SAFE_ALPHANUM, 6);
    let guestId = `GUEST-${shortCode}`;
    while (this.activeGuestIds.has(guestId)) {
      shortCode = randomChars(SAFE_ALPHANUM, 6);
      guestId = `GUEST-${shortCode}`;
    }
    this.activeGuestIds.add(guestId);
    const uid = `guest_${shortCode.toLowerCase()}_${crypto.randomBytes(4).toString("hex")}`;
    const cleanName = String(params?.displayName || "").trim();
    const displayName = cleanName ? cleanName.slice(0, 40) : `Guest ${shortCode.slice(0, 4)}`;
    const sessionToken = `gst_${crypto.randomBytes(24).toString("hex")}`;
    const expiresAtMs = nowMs + inactivityTimeoutMs;
    const record = {
      token: sessionToken,
      uid,
      accessMode: "guest",
      displayName,
      guestId,
      createdAtMs: nowMs,
      lastActiveAtMs: nowMs,
      expiresAtMs,
      inactivityTimeoutMs,
      revoked: false
    };
    this.sessionsByToken.set(sessionToken, record);
    return {
      sessionToken,
      session: this.toPublicSession(record)
    };
  }
  /**
   * Registers a passwordless temporary Friend-Mode account using a Display Name.
   * Generates a unique Login ID (NXID-XXXX-XXXX) and secure Temporary Login Code (XXXX-XXXX).
   * Preserves display name and guest transition metadata when upgrading from a Guest session.
   */
  registerTemporaryAccount(params) {
    const nowMs = params.nowMs ?? Date.now();
    const rawName = String(params.displayName || "").trim();
    if (rawName.length < 2) {
      throw new Error("INVALID_DISPLAY_NAME: Please enter a display name (at least 2 characters).");
    }
    const displayName = rawName.slice(0, 40);
    let loginId = `NXID-${randomChars(SAFE_ALPHANUM, 4)}-${randomChars(SAFE_ALPHANUM, 4)}`;
    while (this.accountsByLoginId.has(loginId)) {
      loginId = `NXID-${randomChars(SAFE_ALPHANUM, 4)}-${randomChars(SAFE_ALPHANUM, 4)}`;
    }
    const loginCode = `${randomChars(SAFE_DIGITS, 4)}-${randomChars(SAFE_ALPHANUM, 4)}`;
    const salt = crypto.randomBytes(16).toString("hex");
    const codeHash = hashLoginCode(loginCode, salt);
    const uid = `usr_${loginId.replace(/[^A-Z0-9]/g, "").toLowerCase()}_${crypto.randomBytes(3).toString("hex")}`;
    const accountTtlMs = 7 * 24 * 60 * 60 * 1e3;
    const accountRecord = {
      uid,
      loginId,
      displayName,
      salt,
      codeHash,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      expiresAtMs: nowMs + accountTtlMs
    };
    this.accountsByLoginId.set(loginId, accountRecord);
    this.accountsByUid.set(uid, accountRecord);
    let migratedFromGuestUid = params.guestUid;
    if (params.guestToken) {
      const prevGuest = this.sessionsByToken.get(params.guestToken);
      if (prevGuest && prevGuest.accessMode === "guest") {
        migratedFromGuestUid = prevGuest.uid;
        prevGuest.revoked = true;
      }
    }
    const sessionToken = `usr_${crypto.randomBytes(24).toString("hex")}`;
    const sessionRecord = {
      token: sessionToken,
      uid,
      accessMode: "friend",
      displayName,
      loginId,
      createdAtMs: nowMs,
      lastActiveAtMs: nowMs,
      expiresAtMs: nowMs + accountTtlMs,
      inactivityTimeoutMs: accountTtlMs,
      migratedFromGuestUid,
      revoked: false
    };
    this.sessionsByToken.set(sessionToken, sessionRecord);
    return {
      sessionToken,
      session: this.toPublicSession(sessionRecord),
      credentials: {
        loginId,
        loginCode,
        displayName,
        issuedAtMs: nowMs,
        expiresAtMs: accountRecord.expiresAtMs
      }
    };
  }
  /**
   * Authenticates a user on any device using their Login ID and Temporary Login Code.
   */
  loginWithTemporaryCode(params) {
    const nowMs = params.nowMs ?? Date.now();
    const normalizedId = normalizeLoginId(params.loginId);
    const normalizedCode = normalizeLoginCode(params.loginCode);
    if (!normalizedId || !normalizedCode) {
      throw new Error("INVALID_CREDENTIALS: Both Login ID and Temporary Login Code are required.");
    }
    this.checkRateLimit(normalizedId, nowMs);
    const account = this.accountsByLoginId.get(normalizedId);
    if (!account) {
      this.recordFailedAttempt(normalizedId, nowMs);
      throw new Error("INVALID_CREDENTIALS: Login ID not found or incorrect Temporary Login Code.");
    }
    if (nowMs > account.expiresAtMs) {
      throw new Error("CREDENTIALS_EXPIRED: This temporary login account has expired. Please create a new temporary login.");
    }
    const computedHash = hashLoginCode(normalizedCode, account.salt);
    if (computedHash !== account.codeHash) {
      this.recordFailedAttempt(normalizedId, nowMs);
      throw new Error("INVALID_CREDENTIALS: Login ID not found or incorrect Temporary Login Code.");
    }
    let migratedFromGuestUid = params.guestUid;
    if (params.guestToken) {
      const prevGuest = this.sessionsByToken.get(params.guestToken);
      if (prevGuest && prevGuest.accessMode === "guest") {
        migratedFromGuestUid = prevGuest.uid;
        prevGuest.revoked = true;
      }
    }
    const accountTtlMs = 7 * 24 * 60 * 60 * 1e3;
    const sessionToken = `usr_${crypto.randomBytes(24).toString("hex")}`;
    const sessionRecord = {
      token: sessionToken,
      uid: account.uid,
      accessMode: "friend",
      displayName: account.displayName,
      loginId: account.loginId,
      createdAtMs: nowMs,
      lastActiveAtMs: nowMs,
      expiresAtMs: nowMs + accountTtlMs,
      inactivityTimeoutMs: accountTtlMs,
      migratedFromGuestUid,
      revoked: false
    };
    this.sessionsByToken.set(sessionToken, sessionRecord);
    return {
      sessionToken,
      session: this.toPublicSession(sessionRecord)
    };
  }
  /**
   * Validates a Bearer session token and enforces inactivity expiration for Guest sessions
   * and TTL expiration for Friend-Mode sessions.
   */
  validateSessionToken(token, options) {
    if (!token) return null;
    const nowMs = options?.nowMs ?? Date.now();
    const touch = options?.touchActivity ?? true;
    const record = this.sessionsByToken.get(token);
    if (!record || record.revoked) {
      return null;
    }
    if (record.accessMode === "guest") {
      const idleMs = nowMs - record.lastActiveAtMs;
      if (idleMs > record.inactivityTimeoutMs || nowMs > record.expiresAtMs) {
        record.revoked = true;
        return null;
      }
      if (touch) {
        record.lastActiveAtMs = nowMs;
        record.expiresAtMs = nowMs + record.inactivityTimeoutMs;
      }
    } else {
      if (nowMs > record.expiresAtMs) {
        record.revoked = true;
        return null;
      }
      if (touch) {
        record.lastActiveAtMs = nowMs;
      }
    }
    return this.toPublicSession(record);
  }
  /**
   * Updates display name or guest inactivity timeout for an active session.
   */
  updateSessionConfig(token, updates) {
    const nowMs = updates.nowMs ?? Date.now();
    const current = this.validateSessionToken(token, { nowMs, touchActivity: true });
    if (!current) {
      throw new Error("SESSION_EXPIRED: Your session has expired.");
    }
    const record = this.sessionsByToken.get(token);
    if (typeof updates.displayName === "string" && updates.displayName.trim().length >= 2) {
      record.displayName = updates.displayName.trim().slice(0, 40);
      const acc = this.accountsByUid.get(record.uid);
      if (acc) {
        acc.displayName = record.displayName;
        acc.updatedAtMs = nowMs;
      }
    }
    if (record.accessMode === "guest" && typeof updates.inactivityTimeoutMinutes === "number" && Number.isFinite(updates.inactivityTimeoutMinutes)) {
      const mins = Math.min(180, Math.max(1, Math.round(updates.inactivityTimeoutMinutes)));
      record.inactivityTimeoutMs = mins * 60 * 1e3;
      record.expiresAtMs = nowMs + record.inactivityTimeoutMs;
    }
    return this.toPublicSession(record);
  }
  revokeSessionToken(token) {
    const record = this.sessionsByToken.get(token);
    if (!record) return false;
    record.revoked = true;
    return true;
  }
  checkRateLimit(key, nowMs) {
    const entry = this.loginAttempts.get(key);
    if (!entry || nowMs - entry.windowStartMs > 6e4) {
      return;
    }
    if (entry.count >= 8) {
      throw new Error(
        "RATE_LIMITED: Too many failed login attempts for this Login ID. Please wait 60 seconds."
      );
    }
  }
  recordFailedAttempt(key, nowMs) {
    const entry = this.loginAttempts.get(key);
    if (!entry || nowMs - entry.windowStartMs > 6e4) {
      this.loginAttempts.set(key, { count: 1, windowStartMs: nowMs });
    } else {
      entry.count += 1;
    }
  }
  toPublicSession(record) {
    return {
      uid: record.uid,
      accessMode: record.accessMode,
      displayName: record.displayName,
      guestId: record.guestId,
      loginId: record.loginId,
      createdAtMs: record.createdAtMs,
      lastActiveAtMs: record.lastActiveAtMs,
      expiresAtMs: record.expiresAtMs,
      inactivityTimeoutMinutes: Math.round(record.inactivityTimeoutMs / 6e4),
      migratedFromGuestUid: record.migratedFromGuestUid
    };
  }
};

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var metadataCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 5 * 60 * 1e3;
var serverMovieCatalog = [...CURATED_CATALOG];
function getCached(key) {
  const entry = metadataCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    metadataCache.delete(key);
    return null;
  }
  return entry.data;
}
function setCached(key, data) {
  if (metadataCache.size > 250) {
    const firstKey = metadataCache.keys().next().value;
    if (firstKey) metadataCache.delete(firstKey);
  }
  metadataCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
}
var socialCinemaManager = new SocialCinemaServerManager();
var tempAuthManager = new TemporaryAuthServerManager();
function decodeSessionContext(token) {
  if (!token) return null;
  if (token.startsWith("gst_") || token.startsWith("usr_")) {
    const validated = tempAuthManager.validateSessionToken(token, { touchActivity: true });
    if (!validated) {
      return null;
    }
    return {
      uid: validated.uid,
      emailVerified: validated.accessMode === "friend",
      accessMode: validated.accessMode,
      guestId: validated.guestId,
      loginId: validated.loginId,
      displayName: validated.displayName
    };
  }
  if (token.startsWith("sandbox-token:")) {
    const sandboxUid = token.slice("sandbox-token:".length).trim();
    if (sandboxUid && /^[a-zA-Z0-9_\-]+$/.test(sandboxUid)) {
      const isGuestFallbackUid = sandboxUid.startsWith("guest_fallback_");
      return {
        uid: sandboxUid,
        emailVerified: !isGuestFallbackUid,
        accessMode: isGuestFallbackUid ? "guest" : "friend"
      };
    }
    return null;
  }
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
      const payload = JSON.parse(payloadJson);
      const uid = payload.user_id || payload.sub;
      const exp = payload.exp;
      if (typeof uid === "string" && uid.length > 0) {
        if (typeof exp === "number" && exp * 1e3 < Date.now()) {
          return null;
        }
        return {
          uid,
          emailVerified: Boolean(payload.email_verified ?? true),
          accessMode: "friend"
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}
function extractAuthenticatedUid(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  return decodeBearerToken(token);
}
function decodeBearerToken(token) {
  const ctx = decodeSessionContext(token);
  if (!ctx) return null;
  return { uid: ctx.uid, emailVerified: ctx.emailVerified };
}
function extractSessionContext(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  return decodeSessionContext(token);
}
function requireStrictUidOwnership(req, res, next) {
  const authUser = extractAuthenticatedUid(req);
  if (!authUser) {
    res.status(401).json({
      error: "UNAUTHENTICATED: Valid Authorization Bearer token is required.",
      code: "PERMISSION_DENIED"
    });
    return;
  }
  const targetUid = req.params.uid || req.body?.uid;
  if (!targetUid || authUser.uid !== targetUid) {
    res.status(403).json({
      error: "FORBIDDEN: Cross-account access is strictly prohibited. Ownership UID mismatch.",
      code: "PERMISSION_DENIED"
    });
    return;
  }
  next();
}
function requireAuthenticatedUser(req, res, next) {
  const sessionCtx = extractSessionContext(req);
  if (!sessionCtx) {
    res.status(401).json({
      error: "UNAUTHENTICATED: Your session is missing or has expired. Please continue as Guest or log in.",
      code: "AUTH_REQUIRED"
    });
    return;
  }
  req.authUser = sessionCtx;
  next();
}
function createApp(onRoomBroadcast) {
  const app = express();
  app.use(express.json({ limit: "5mb" }));
  const broadcastRoomState = (roomId, eventType, payload) => {
    if (onRoomBroadcast) {
      onRoomBroadcast(roomId, eventType, payload);
    }
  };
  app.post("/api/auth/guest", (req, res) => {
    const { displayName, inactivityTimeoutMinutes } = req.body || {};
    const created = tempAuthManager.createGuestSession({
      displayName,
      inactivityTimeoutMinutes
    });
    res.status(201).json(created);
  });
  app.post("/api/auth/login-create", (req, res) => {
    const { displayName, guestToken, guestUid } = req.body || {};
    try {
      const created = tempAuthManager.registerTemporaryAccount({
        displayName: String(displayName || ""),
        guestToken,
        guestUid
      });
      res.status(201).json({
        ...created,
        account: {
          uid: created.session.uid,
          loginId: created.credentials.loginId,
          displayName: created.session.displayName
        },
        loginCode: created.credentials.loginCode,
        migratedFromGuestUid: created.session.migratedFromGuestUid
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Unable to create temporary login."
      });
    }
  });
  app.post("/api/auth/login-verify", (req, res) => {
    const { loginId, loginCode, guestToken, guestUid } = req.body || {};
    try {
      const verified = tempAuthManager.loginWithTemporaryCode({
        loginId: String(loginId || ""),
        loginCode: String(loginCode || ""),
        guestToken,
        guestUid
      });
      res.json({
        ...verified,
        account: {
          uid: verified.session.uid,
          loginId: verified.session.loginId,
          displayName: verified.session.displayName
        },
        migratedFromGuestUid: verified.session.migratedFromGuestUid
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid Login ID or Temporary Login Code.";
      const status = msg.startsWith("RATE_LIMITED") ? 429 : 401;
      res.status(status).json({ error: msg });
    }
  });
  app.get("/api/auth/session", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ valid: false, error: "NO_TOKEN" });
      return;
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.startsWith("gst_") || token.startsWith("usr_")) {
      const session = tempAuthManager.validateSessionToken(token, { touchActivity: true });
      if (!session) {
        res.status(401).json({
          valid: false,
          error: "SESSION_EXPIRED: Your temporary session has expired due to inactivity."
        });
        return;
      }
      res.json({ valid: true, session });
      return;
    }
    const fallbackCtx = decodeSessionContext(token);
    if (!fallbackCtx) {
      res.status(401).json({ valid: false, error: "INVALID_SESSION" });
      return;
    }
    res.json({
      valid: true,
      session: {
        uid: fallbackCtx.uid,
        accessMode: fallbackCtx.accessMode,
        displayName: fallbackCtx.displayName || "CineShelf Member",
        guestId: fallbackCtx.guestId,
        loginId: fallbackCtx.loginId,
        inactivityTimeoutMinutes: 30
      }
    });
  });
  app.post("/api/auth/session/config", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
    if (!token.startsWith("gst_") && !token.startsWith("usr_")) {
      res.status(400).json({ error: "Session configuration requires an active guest or temporary login token." });
      return;
    }
    try {
      const updated = tempAuthManager.updateSessionConfig(token, {
        displayName: req.body?.displayName,
        inactivityTimeoutMinutes: typeof req.body?.inactivityTimeoutMinutes === "number" ? req.body.inactivityTimeoutMinutes : void 0
      });
      res.json({ session: updated });
    } catch (err) {
      res.status(401).json({
        error: err instanceof Error ? err.message : "Session expired."
      });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
    if (token) {
      tempAuthManager.revokeSessionToken(token);
    }
    res.json({ loggedOut: true });
  });
  app.get("/api/status", (_req, res) => {
    const livekitWsUrl = process.env.LIVEKIT_WS_URL || process.env.LIVEKIT_URL || "";
    const livekitConfigured = Boolean(
      livekitWsUrl.trim() && process.env.LIVEKIT_API_KEY?.trim() && process.env.LIVEKIT_API_SECRET?.trim()
    );
    res.json({
      service: "CineShelf NEXUS API",
      status: "ok",
      localDatabaseReady: true,
      catalogCount: serverMovieCatalog.length,
      wikidataImportSupported: true,
      adminCatalogueSupported: true,
      tvmazeConfigured: true,
      curatedCatalogConfigured: true,
      manualEntryConfigured: true,
      guestModeSupported: true,
      temporaryLoginSupported: true,
      livekitConfigured,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
      ),
      attribution: "Movies powered by CineShelf Local JSON Database, Wikidata Open Data (CC0), and Administrator Catalogue. Television series metadata provided by TVmaze.com (CC BY-SA)."
    });
  });
  app.get("/api/catalog", (_req, res) => {
    res.json({
      items: serverMovieCatalog,
      totalCount: serverMovieCatalog.length,
      sources: ["local_json", "wikidata", "admin_catalogue", "tvmaze"]
    });
  });
  app.post("/api/catalog", (req, res) => {
    const incoming = req.body;
    if (!incoming || !incoming.title || !String(incoming.title).trim()) {
      res.status(400).json({ error: "Movie title is required." });
      return;
    }
    const hydrated = hydrateCatalogItemArtwork({
      ...incoming,
      movieId: incoming.movieId || `admin-${String(incoming.title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${incoming.releaseYear || 2024}`,
      metadataProvider: incoming.metadataProvider || "admin_catalogue",
      title: String(incoming.title).trim(),
      contentType: incoming.contentType || "movie",
      releaseYear: Number(incoming.releaseYear) || 2024,
      language: incoming.language || "English",
      country: incoming.country || "United States",
      director: incoming.director || "Independent",
      cast: Array.isArray(incoming.cast) ? incoming.cast : [],
      genres: Array.isArray(incoming.genres) && incoming.genres.length > 0 ? incoming.genres : ["Drama"],
      tags: Array.isArray(incoming.tags) ? incoming.tags : [],
      runtimeMinutes: Number(incoming.runtimeMinutes) || 120,
      communityRating: Number(incoming.communityRating) || 8,
      popularityScore: Number(incoming.popularityScore) || 85,
      overview: incoming.overview || "Verified entry in the CineShelf NEXUS catalogue.",
      posterUrl: incoming.posterUrl || "",
      backdropUrl: incoming.backdropUrl || "",
      streamingByRegion: incoming.streamingByRegion || {},
      addedAt: incoming.addedAt || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
    });
    const existingIdx = serverMovieCatalog.findIndex(
      (m) => m.movieId === hydrated.movieId || m.title.toLowerCase() === hydrated.title.toLowerCase() && m.releaseYear === hydrated.releaseYear
    );
    if (existingIdx >= 0) {
      serverMovieCatalog[existingIdx] = mergeCatalogItemPreservingEdits(
        serverMovieCatalog[existingIdx],
        hydrated
      ).merged;
      res.json({ item: serverMovieCatalog[existingIdx], updated: true, totalCount: serverMovieCatalog.length });
    } else {
      serverMovieCatalog = [hydrated, ...serverMovieCatalog];
      res.status(201).json({ item: hydrated, created: true, totalCount: serverMovieCatalog.length });
    }
  });
  app.delete("/api/catalog/:movieId", (req, res) => {
    const movieId = String(req.params.movieId || "").trim();
    const before = serverMovieCatalog.length;
    serverMovieCatalog = serverMovieCatalog.filter((m) => m.movieId !== movieId);
    res.json({
      deleted: serverMovieCatalog.length < before,
      movieId,
      totalCount: serverMovieCatalog.length
    });
  });
  app.post("/api/catalog/import", (req, res) => {
    const { rawContent, items, formatHint } = req.body;
    const effectiveRaw = typeof rawContent === "string" && rawContent.trim().length > 0 ? rawContent : Array.isArray(items) && items.length > 0 ? JSON.stringify(items) : "";
    const preview = parseAndValidateCatalogueImport(
      effectiveRaw,
      serverMovieCatalog,
      formatHint
    );
    if (!preview.isValid) {
      res.status(400).json({ preview });
      return;
    }
    const next = [...serverMovieCatalog];
    for (const incoming of preview.parsedItems) {
      const idx = next.findIndex(
        (existing) => existing.movieId === incoming.movieId || existing.wikidataId && incoming.wikidataId && existing.wikidataId === incoming.wikidataId || existing.title.toLowerCase() === incoming.title.toLowerCase() && existing.releaseYear === incoming.releaseYear
      );
      if (idx >= 0) {
        next[idx] = mergeCatalogItemPreservingEdits(next[idx], incoming).merged;
      } else {
        next.unshift(incoming);
      }
    }
    serverMovieCatalog = next;
    res.json({
      preview,
      totalCount: serverMovieCatalog.length
    });
  });
  app.get("/api/metadata/search", async (req, res) => {
    const query = String(req.query.q || "").trim();
    const contentType = String(req.query.contentType || "all").trim();
    const providerFilter = String(req.query.provider || "all").trim();
    const cacheKey = `multi:${query.toLowerCase()}:${contentType}:${providerFilter}:${serverMovieCatalog.length}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    try {
      const response = await searchMultiSourceMetadata(
        query,
        providerFilter === "all" ? "auto" : providerFilter,
        serverMovieCatalog
      );
      setCached(cacheKey, response);
      res.json(response);
    } catch (err) {
      res.json({
        results: serverMovieCatalog,
        providersUsed: ["local_json"],
        providerStates: {
          local_json: "active",
          wikidata: "active",
          admin_catalogue: "active",
          tvmaze: "unavailable",
          curated_catalog: "active",
          manual: "active"
        },
        errorNotice: err instanceof Error ? err.message : "External TVmaze metadata provider temporarily unavailable; serving local movie database."
      });
    }
  });
  app.get("/api/metadata/tvmaze/show/:id", async (req, res) => {
    const showId = String(req.params.id || "").replace(/^tvmaze-/, "").trim();
    if (!showId || !/^\d+$/.test(showId)) {
      res.status(400).json({ error: "Valid numeric TVmaze show ID is required." });
      return;
    }
    const cacheKey = `tvmaze:show:${showId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.json({ item: cached, provider: "tvmaze", attribution: "TVmaze.com (CC BY-SA)" });
      return;
    }
    try {
      const url = `https://api.tvmaze.com/shows/${encodeURIComponent(showId)}?embed[]=episodes&embed[]=cast&embed[]=seasons`;
      const resp = await fetch(url);
      if (!resp.ok) {
        res.status(404).json({ error: "Show not found on TVmaze." });
        return;
      }
      const rawShow = await resp.json();
      const item = mapTvMazeShowToCatalogItem(rawShow);
      setCached(cacheKey, item);
      res.json({
        item,
        provider: "tvmaze",
        attribution: "Data & artwork provided by TVmaze.com (CC BY-SA)"
      });
    } catch {
      res.status(503).json({
        error: "TVmaze public API is temporarily unreachable. You can still enter or edit metadata manually."
      });
    }
  });
  app.get("/api/catalog/discover", async (req, res) => {
    const query = String(req.query.q || "").trim();
    const actor = String(req.query.actor || "").trim();
    const director = String(req.query.director || "all").trim();
    const genre = String(req.query.genre || "all").trim();
    const language = String(req.query.language || "all").trim();
    const country = String(req.query.country || "all").trim();
    const year = String(req.query.year || "all").trim();
    const minRating = Number(req.query.minRating || 0);
    const maxRuntime = Number(req.query.maxRuntime || 1e3);
    const contentType = String(req.query.contentType || "all").trim();
    const sortBy = String(req.query.sortBy || "popularity").trim();
    const results = queryLocalCatalog(serverMovieCatalog, {
      query,
      actor,
      director,
      genre,
      language,
      country,
      year,
      minRating,
      maxRuntime,
      contentType,
      sortBy
    });
    res.json({
      results,
      source: "local_movie_database",
      totalCatalogSize: serverMovieCatalog.length
    });
  });
  app.post("/api/user/:uid/recommendations/ai-explain", requireStrictUidOwnership, async (req, res) => {
    const { prompt, watchedTitles = [], favouriteGenres = [] } = req.body;
    const userQuery = String(prompt || "Show me more movies like the last five films I watched").slice(0, 500);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      res.json({
        curatorSummary: `Based on your recent viewing history (${watchedTitles.slice(0, 5).join(", ") || "your library"}) and preference for ${favouriteGenres.slice(0, 3).join(", ") || "high-tension storytelling"}, our deterministic recommendation engine prioritized tactical realism, strong biographical arcs, and auteur thrillers.`,
        picks: [],
        mode: "deterministic_engine"
      });
      return;
    }
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `User Request: "${userQuery}"
User's Recently Watched Titles: ${watchedTitles.slice(0, 8).join(", ") || "Uri: The Surgical Strike, Lakshya, Severance"}
User's Favourite Genres: ${favouriteGenres.slice(0, 5).join(", ") || "Military Drama, Espionage, Sci-Fi"}
Provide a concise 2-sentence curator analysis and 3 specific film/series recommendations with clear "whyRecommended" explanations referencing the user's watched titles.`,
        config: {
          systemInstruction: "You are the private cinema curator for CineShelf NEXUS. Never recommend titles the user already watched unless asked for rewatches. Always explain WHY each title matches the user\u2019s specific viewing history.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              curatorSummary: {
                type: Type.STRING,
                description: "2-sentence synthesis of the user\u2019s recent viewing pattern."
              },
              picks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    releaseYear: { type: Type.NUMBER },
                    genre: { type: Type.STRING },
                    whyRecommended: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json({
        curatorSummary: parsed.curatorSummary || "Curated analysis based on your private viewing history.",
        picks: Array.isArray(parsed.picks) ? parsed.picks : [],
        mode: "gemini_assisted"
      });
    } catch (error) {
      res.status(200).json({
        curatorSummary: `Deterministic synthesis from your recent viewings (${watchedTitles.slice(0, 5).join(", ") || "your library"}): prioritizing high-craft cinema in ${favouriteGenres.slice(0, 2).join(" & ") || "Military Drama & Thriller"}.`,
        picks: [],
        mode: "deterministic_fallback",
        notice: error instanceof Error ? error.message : "Using deterministic recommendation engine."
      });
    }
  });
  app.get("/api/user/:uid/security-verify", requireStrictUidOwnership, (req, res) => {
    res.json({
      verified: true,
      uid: req.params.uid,
      isolationModel: "users/{uid}/...",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/social/media/validate", requireAuthenticatedUser, (req, res) => {
    const { url, title } = req.body;
    const result = validateAndClassifyMediaSource(String(url || ""), title);
    res.json({ mediaSource: result });
  });
  app.get("/api/social/browser/inspect", async (req, res) => {
    const rawUrl = String(req.query.url || "").trim();
    if (!rawUrl) {
      res.status(400).json({ canEmbed: false, reason: "Please enter a valid website URL or search query." });
      return;
    }
    let parsed;
    try {
      parsed = new URL(rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`);
    } catch {
      res.json({
        url: rawUrl,
        host: rawUrl,
        canEmbed: false,
        reason: "Malformed URL format."
      });
      return;
    }
    const host = parsed.hostname.toLowerCase();
    const knownFrameBlocked = [
      "google.com",
      "www.google.com",
      "youtube.com",
      "www.youtube.com",
      "netflix.com",
      "www.netflix.com",
      "primevideo.com",
      "www.primevideo.com",
      "disneyplus.com",
      "www.disneyplus.com",
      "github.com",
      "twitter.com",
      "x.com",
      "reddit.com",
      "www.reddit.com",
      "imdb.com",
      "www.imdb.com",
      "letterboxd.com",
      "bingr.one",
      "www.bingr.one",
      "cinejoy.to"
    ];
    if (knownFrameBlocked.some((d) => host === d || host.endsWith(`.${d}`))) {
      res.json({
        url: parsed.toString(),
        host,
        canEmbed: false,
        reason: `${host} sets X-Frame-Options / CSP frame-ancestors security headers that disallow embedded browsing. Use "Open in External Browser" below to view it directly.`
      });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3e3);
    try {
      const response = await fetch(parsed.toString(), {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CineShelfNexusBrowser/1.0)"
        }
      });
      clearTimeout(timer);
      const xfo = (response.headers.get("x-frame-options") || "").toLowerCase();
      const csp = (response.headers.get("content-security-policy") || "").toLowerCase();
      if (xfo.includes("deny") || xfo.includes("sameorigin")) {
        res.json({
          url: parsed.toString(),
          host,
          canEmbed: false,
          reason: `${host} blocks embedded viewing via X-Frame-Options (${xfo.toUpperCase()}).`
        });
        return;
      }
      if (csp.includes("frame-ancestors")) {
        const match = csp.split(";").find((dir) => dir.trim().startsWith("frame-ancestors"));
        if (match && (match.includes("'none'") || match.includes("'self'"))) {
          res.json({
            url: parsed.toString(),
            host,
            canEmbed: false,
            reason: `${host} restricts iframe embedding via Content-Security-Policy (${match.trim()}).`
          });
          return;
        }
      }
      res.json({
        url: parsed.toString(),
        host,
        canEmbed: true,
        reason: "Verified embeddable in NEXUS In-App Browser."
      });
    } catch {
      clearTimeout(timer);
      res.json({
        url: parsed.toString(),
        host,
        canEmbed: true,
        reason: "Attempting direct iframe load. If blocked by browser security, use Open in External Browser."
      });
    }
  });
  app.post("/api/social/rooms", requireAuthenticatedUser, (req, res) => {
    const authUser = req.authUser;
    const { roomName, hostName, roomMode, theme, capacity, appearance } = req.body;
    const requestedMode = roomMode === "bot_sandbox" ? "bot_sandbox" : "friends";
    if (requestedMode === "friends" && authUser.accessMode === "guest") {
      res.status(403).json({
        error: "FRIEND_LOGIN_REQUIRED: Please log in to create a private multiplayer room with friends. Guests can freely use the 3D theatre with AI bots.",
        code: "FRIEND_LOGIN_REQUIRED"
      });
      return;
    }
    try {
      const room = socialCinemaManager.createRoom({
        hostUid: authUser.uid,
        hostName: String(hostName || appearance?.displayName || authUser.displayName || "Cinema Host").slice(0, 60),
        roomName: String(
          roomName || (requestedMode === "bot_sandbox" ? "3D Cinema Practice & AI Bots" : "NEXUS Private 3D Premiere")
        ).slice(0, 80),
        roomMode: requestedMode,
        theme,
        capacity,
        appearance
      });
      res.status(201).json({ room });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Failed to create room."
      });
    }
  });
  app.post("/api/social/rooms/join", requireAuthenticatedUser, (req, res) => {
    const authUser = req.authUser;
    if (authUser.accessMode === "guest") {
      res.status(403).json({
        error: "FRIEND_LOGIN_REQUIRED: Please log in to join a friend\u2019s multiplayer room.",
        code: "FRIEND_LOGIN_REQUIRED"
      });
      return;
    }
    const { inviteCode, displayName, appearance } = req.body;
    try {
      const room = socialCinemaManager.joinRoomByInviteCode({
        uid: authUser.uid,
        displayName: String(displayName || appearance?.displayName || authUser.displayName || "CineShelf Member").slice(0, 60),
        inviteCode: String(inviteCode || ""),
        appearance
      });
      broadcastRoomState(room.roomId, "room_snapshot", { room });
      res.json({ room });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to join room.";
      const status = message.startsWith("ROOM_CAPACITY_FULL") || message.startsWith("ROOM_LOCKED") ? 409 : message.startsWith("RATE_LIMITED") ? 429 : 400;
      res.status(status).json({ error: message });
    }
  });
  app.post("/api/social/rooms/:roomId/upgrade-to-friends", requireAuthenticatedUser, (req, res) => {
    const authUser = req.authUser;
    if (authUser.accessMode === "guest") {
      res.status(403).json({
        error: "FRIEND_LOGIN_REQUIRED: Log in to upgrade this theatre to Friend Mode.",
        code: "FRIEND_LOGIN_REQUIRED"
      });
      return;
    }
    const { previousGuestUid, displayName } = req.body || {};
    try {
      const room = socialCinemaManager.upgradeBotRoomToFriendsRoom({
        roomId: req.params.roomId,
        previousHostUid: previousGuestUid,
        newHostUid: authUser.uid,
        newHostName: String(displayName || authUser.displayName || "Cinema Host").slice(0, 60)
      });
      broadcastRoomState(room.roomId, "room_snapshot", { room });
      res.json({ room });
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : "Unable to upgrade room."
      });
    }
  });
  app.get("/api/social/rooms/:roomId", requireAuthenticatedUser, (req, res) => {
    const authUser = req.authUser;
    try {
      const room = socialCinemaManager.getRoomForMember(req.params.roomId, authUser.uid);
      res.json({ room });
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : "Access denied."
      });
    }
  });
  app.post("/api/social/rooms/:roomId/action", requireAuthenticatedUser, (req, res) => {
    const authUser = req.authUser;
    const roomId = req.params.roomId;
    const body = req.body;
    const actionType = String(body.type || "");
    try {
      switch (actionType) {
        case "move": {
          const { participant, collided } = socialCinemaManager.updateParticipantMovement({
            roomId,
            authenticatedUid: authUser.uid,
            targetUid: body.targetUid,
            x: Number(body.x ?? 0),
            y: typeof body.y === "number" ? Number(body.y) : void 0,
            z: Number(body.z ?? 10),
            rotationY: Number(body.rotationY ?? Math.PI),
            animation: body.animation
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, "participant_updated", { participant });
          res.json({ participant, collided, room });
          return;
        }
        case "refreshment": {
          const participant = socialCinemaManager.interactWithRefreshment({
            roomId,
            uid: authUser.uid,
            action: body.action,
            itemVariant: body.itemVariant
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, "participant_updated", { participant });
          res.json({ participant, room });
          return;
        }
        case "seat": {
          const participant = socialCinemaManager.toggleSeat({
            roomId,
            uid: authUser.uid,
            requestedSeatIndex: typeof body.seatIndex === "number" ? body.seatIndex : void 0
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, "participant_updated", { participant });
          res.json({ participant, room });
          return;
        }
        case "emote": {
          const participant = socialCinemaManager.triggerEmote({
            roomId,
            uid: authUser.uid,
            emote: body.emote
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, "participant_updated", { participant });
          res.json({ participant, room });
          return;
        }
        case "chat": {
          const message = socialCinemaManager.sendChatMessage({
            roomId,
            uid: authUser.uid,
            text: String(body.text || ""),
            isNearbyOnly: Boolean(body.isNearbyOnly)
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, "chat_message", { message });
          res.json({ message, room });
          return;
        }
        case "playback": {
          const playback = socialCinemaManager.controlPlayback({
            roomId,
            uid: authUser.uid,
            action: body.action,
            positionSeconds: typeof body.positionSeconds === "number" ? body.positionSeconds : void 0,
            durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : void 0,
            sourceUrl: body.sourceUrl,
            sourceTitle: body.sourceTitle
          });
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, "playback_updated", { playback });
          res.json({ playback, room });
          return;
        }
        case "theme": {
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          if (room.hostUid !== authUser.uid) {
            throw new Error("HOST_ONLY: Only the room host can change the 3D theatre theme.");
          }
          room.theme = body.theme;
          room.updatedAtMs = Date.now();
          broadcastRoomState(roomId, "room_snapshot", { room });
          res.json({ room });
          return;
        }
        case "voice_state": {
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          const p = room.participants[authUser.uid];
          if (typeof body.isMuted === "boolean") p.isMuted = body.isMuted;
          if (typeof body.isSpeaking === "boolean") p.isSpeaking = body.isSpeaking && !p.isMuted && !p.isHostMuted;
          if (body.voiceMode) p.voiceMode = body.voiceMode;
          broadcastRoomState(roomId, "participant_updated", { participant: p });
          res.json({ participant: p, room });
          return;
        }
        case "regenerate_invite": {
          const inviteCode = socialCinemaManager.regenerateInviteCode(roomId, authUser.uid);
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, "room_snapshot", { room });
          res.json({ inviteCode, room });
          return;
        }
        case "revoke_invite": {
          socialCinemaManager.revokeInviteCode(roomId, authUser.uid);
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          broadcastRoomState(roomId, "room_snapshot", { room });
          res.json({ room });
          return;
        }
        case "lock_room": {
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          if (room.hostUid !== authUser.uid) {
            throw new Error("HOST_ONLY: Only the host can lock or unlock the room.");
          }
          room.isLocked = Boolean(body.isLocked);
          broadcastRoomState(roomId, "room_snapshot", { room });
          res.json({ room });
          return;
        }
        case "transfer_host": {
          const room = socialCinemaManager.transferHost({
            roomId,
            currentHostUid: authUser.uid,
            newHostUid: String(body.newHostUid || "")
          });
          broadcastRoomState(roomId, "room_snapshot", { room });
          res.json({ room });
          return;
        }
        case "promote_cohost": {
          const room = socialCinemaManager.promoteCoHost({
            roomId,
            hostUid: authUser.uid,
            targetUid: String(body.targetUid || ""),
            makeCoHost: Boolean(body.makeCoHost)
          });
          broadcastRoomState(roomId, "room_snapshot", { room });
          res.json({ room });
          return;
        }
        case "kick_member": {
          const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
          if (room.hostUid !== authUser.uid) {
            throw new Error("HOST_ONLY: Only the host can remove a participant.");
          }
          const targetUid = String(body.targetUid || "");
          if (targetUid && targetUid !== authUser.uid) {
            socialCinemaManager.leaveRoom(roomId, targetUid);
          }
          broadcastRoomState(roomId, "room_snapshot", { room });
          res.json({ room });
          return;
        }
        case "leave": {
          const outcome = socialCinemaManager.leaveRoom(roomId, authUser.uid);
          try {
            const room = socialCinemaManager.getRoomForMember(roomId, outcome.promotedHostUid || "");
            broadcastRoomState(roomId, "room_snapshot", { room });
          } catch {
          }
          res.json({ left: true, ...outcome });
          return;
        }
        default:
          res.status(400).json({ error: `Unknown action type: ${actionType}` });
      }
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : "Action rejected by authoritative server."
      });
    }
  });
  app.post("/api/social/rooms/:roomId/simulate-load", requireAuthenticatedUser, (req, res) => {
    const authUser = req.authUser;
    const roomId = req.params.roomId;
    const targetCount = Math.min(35, Math.max(1, Number(req.body?.targetCount || 30)));
    try {
      const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
      if (room.hostUid !== authUser.uid) {
        res.status(403).json({ error: "HOST_ONLY: Only the room host can trigger the load simulator." });
        return;
      }
      const maxAllowed = Math.min(room.capacity, targetCount, 35);
      let addedCount = 0;
      let idx = 1;
      while (Object.keys(room.participants).length < maxAllowed && idx <= 50) {
        const simUid = `sim_patron_${idx}`;
        idx += 1;
        if (room.participants[simUid]) continue;
        const simName = `Patron #${Object.keys(room.participants).length + 1}`;
        const appearance = generateDefaultAppearanceForUid(simUid, simName);
        socialCinemaManager.joinRoomByInviteCode({
          uid: simUid,
          displayName: simName,
          inviteCode: room.inviteCode,
          appearance
        });
        if (idx % 4 !== 0) {
          socialCinemaManager.toggleSeat({ roomId, uid: simUid });
        }
        if (idx % 3 === 0) {
          socialCinemaManager.interactWithRefreshment({
            roomId,
            uid: simUid,
            action: "pickup_popcorn",
            itemVariant: idx % 2 === 0 ? "popcorn_butter" : "popcorn_caramel"
          });
        } else if (idx % 5 === 0) {
          socialCinemaManager.interactWithRefreshment({
            roomId,
            uid: simUid,
            action: "pickup_drink",
            itemVariant: "drink_cola"
          });
        }
        addedCount += 1;
      }
      const updatedRoom = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
      broadcastRoomState(roomId, "room_snapshot", { room: updatedRoom });
      res.json({
        addedCount,
        totalParticipants: Object.keys(updatedRoom.participants).length,
        capacity: updatedRoom.capacity,
        room: updatedRoom
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Simulation failed."
      });
    }
  });
  app.post("/api/social/rooms/:roomId/voice-token", requireAuthenticatedUser, (req, res) => {
    const authUser = req.authUser;
    const roomId = req.params.roomId;
    try {
      const room = socialCinemaManager.getRoomForMember(roomId, authUser.uid);
      const livekitWsUrl = (process.env.LIVEKIT_WS_URL || process.env.LIVEKIT_URL || "").trim();
      const sfuConfigured = Boolean(
        livekitWsUrl && process.env.LIVEKIT_API_KEY?.trim() && process.env.LIVEKIT_API_SECRET?.trim()
      );
      res.json({
        roomId: room.roomId,
        uid: authUser.uid,
        sfuConfigured,
        sfuUrl: livekitWsUrl || null,
        livekitWsUrl: livekitWsUrl || null,
        ephemeralToken: `nexus-sfu-ephemeral-${room.roomId}-${authUser.uid}-${Date.now()}`,
        spatialAudioMode: "webrtc_mesh_and_panner_3d",
        expiresAtMs: Date.now() + 1e3 * 60 * 30
      });
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : "Not authorized for room voice channel."
      });
    }
  });
  return app;
}
function createHttpServerAndApp() {
  const roomSockets = /* @__PURE__ */ new Map();
  const broadcastToRoom = (roomId, eventType, payload) => {
    const clients = roomSockets.get(roomId);
    if (!clients || clients.size === 0) return;
    const messageStr = JSON.stringify({
      type: eventType,
      roomId,
      timestampMs: Date.now(),
      ...payload
    });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  };
  const app = createApp(broadcastToRoom);
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
      const protocolHeader = String(request.headers["sec-websocket-protocol"] || "");
      if (protocolHeader.includes("vite-hmr") || protocolHeader.includes("vite-ping")) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          if (protocolHeader.includes("vite-hmr")) {
            ws.send(JSON.stringify({ type: "connected" }));
          }
          ws.on("error", () => {
          });
        });
        return;
      }
      if (url.pathname === "/ws/nexus-social") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
        return;
      }
      socket.destroy();
    } catch {
      socket.destroy();
    }
  });
  wss.on("connection", (ws) => {
    let subscribedRoomId = null;
    let authenticatedUid = null;
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === "subscribe") {
          const tokenInfo = decodeBearerToken(String(msg.token || ""));
          if (!tokenInfo) {
            ws.send(JSON.stringify({ type: "error", error: "UNAUTHENTICATED" }));
            return;
          }
          const roomId = String(msg.roomId || "");
          const room = socialCinemaManager.getRoomForMember(roomId, tokenInfo.uid);
          authenticatedUid = tokenInfo.uid;
          subscribedRoomId = roomId;
          if (!roomSockets.has(roomId)) {
            roomSockets.set(roomId, /* @__PURE__ */ new Set());
          }
          roomSockets.get(roomId).add(ws);
          ws.send(JSON.stringify({ type: "room_snapshot", room }));
          return;
        }
        if (!authenticatedUid || !subscribedRoomId) {
          ws.send(JSON.stringify({ type: "error", error: "NOT_SUBSCRIBED" }));
          return;
        }
        if (msg.type === "move") {
          const { participant, collided } = socialCinemaManager.updateParticipantMovement({
            roomId: subscribedRoomId,
            authenticatedUid,
            x: Number(msg.x ?? 0),
            y: typeof msg.y === "number" ? Number(msg.y) : void 0,
            z: Number(msg.z ?? 10),
            rotationY: Number(msg.rotationY ?? Math.PI),
            animation: msg.animation
          });
          broadcastToRoom(subscribedRoomId, "participant_updated", { participant, collided });
        } else if (msg.type === "heartbeat") {
          const room = socialCinemaManager.getRoomForMember(subscribedRoomId, authenticatedUid);
          ws.send(
            JSON.stringify({
              type: "playback_updated",
              playback: room.playback,
              serverTimestampMs: Date.now()
            })
          );
        }
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: err instanceof Error ? err.message : "Invalid WebSocket message"
          })
        );
      }
    });
    ws.on("close", () => {
      if (subscribedRoomId && roomSockets.has(subscribedRoomId)) {
        roomSockets.get(subscribedRoomId).delete(ws);
      }
    });
  });
  return { app, server, wss };
}
async function startServer() {
  const { app, server } = createHttpServerAndApp();
  const port = Number(process.env.PORT) || 3e3;
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.get("/@vite/client", async (_req, res, next) => {
      try {
        const transformed = await vite.transformRequest("/@vite/client");
        if (transformed?.code) {
          const safeClientCode = transformed.code.replace(
            /transport\.connect\(createHMRHandler\(handleMessage\)\);/g,
            "/* HMR WebSocket disabled */"
          ).replace(
            /setupForwardConsoleHandler\(transport,\s*forwardConsole\);/g,
            "/* forwardConsole disabled */"
          ).replace(
            /reject\(\/\* @__PURE__ \*\/ new Error\("WebSocket closed without opened\."\)\);/g,
            "resolve();"
          ).replace(
            /reject\(new Error\("WebSocket closed without opened\."\)\);/g,
            "resolve();"
          );
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          res.status(200).send(safeClientCode);
          return;
        }
      } catch {
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`CineShelf NEXUS full-stack + WebSocket server running on http://0.0.0.0:${port}`);
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  startServer();
}
export {
  createApp,
  createHttpServerAndApp,
  decodeBearerToken,
  decodeSessionContext,
  extractAuthenticatedUid,
  extractSessionContext,
  requireAuthenticatedUser,
  requireStrictUidOwnership,
  socialCinemaManager,
  tempAuthManager
};
