const om = {
  common: {
    appName: "Addis Football",
    loading: "Fe'amaa jira...",
    save: "Olkaa'i",
    cancel: "Haqi",
    close: "Cufi",
    retry: "Irra deebi'i",
    error: "Rakkoon uumameera",
  },

  tabs: {
    discover: "Taphoota",
    bookings: "Taphoota Koo",
    profile: "Profaayilii",
  },

  discover: {
    title: "Taphoota",
    subtitle: "Finfinneetti kubbaa miilaa taphadhu",
    searchPlaceholder: "Tapha, dirree ykn naannoo barbaadi",

    today: "Har'a",
    tomorrow: "Boru",

    games: "Taphoota",
    game: "tapha",
    gamesCount: "taphoota",

    findingGames: "Taphoota barbaadaa jira...",
    noGamesFound: "Taphoonni hin argamne",
    noGamesForDay:
      "Guyyaa kanaaf taphoonni dhufan hin jirani.",
    noSearchResults:
      "Barbaacha biraa yaali ykn guyyaa biraa filadhu.",

    available: "Bakka qaba",
    full: "Guuteera",
    cancelled: "Haqameera",
    spotsLeft: "bakka hafe",
    joinGame: "Tapha Makami",
    joinWaitlist: "Tarree Eegumsaa Makami",
    payWithTelebirr: "Telebirriin Kaffali",
  },

  gameCard: {
    gameFull: "Taphi guuteera",
    confirmed: "Mirkanaa'eera",
    by: "qopheessaan",
    spotsLeft: "bakka hafe",
    free: "BILISA",

    allLevels: "Sadarkaa Hunda",
    beginner: "Jalqabaa",
    intermediate: "Giddugaleessa",
    advanced: "Olaanaa",

    joined: "Makameera",
    waitlisted: "Tarree eegumsaa keessa",
    joinGame: "Tapha Makami",
    joinWaitlist: "Tarree Eegumsaa Makami",
    joining: "Makamaa jira...",
    joiningWaitlist: "Tarree eegumsaa makamaa jira...",

    connectingTelebirr:
      "Telebirr waliin wal qunnamsiisaa jira...",
    checkingPayment: "Kaffaltii mirkaneessaa jira...",
    checkPayment: "Kaffaltii Mirkaneessi",
    payWithTelebirr: "Telebirriin Kaffali",

    offerExpired: "Yeroon Kaffaltii Darbeera",
    spotOpened: "Bakki banameera!",

    offerExpiredDescription:
      "Yeroon bakka kanaaf kaffaltii raawwachuuf kenname darbeera. Qabannaan kee ofumaan haaromfama.",

    reservedDescription:
      "Bakki kee yeroo muraasaaf qabameera. Yeroon osoo hin xumuramin kaffaltii Telebirr xumuri.",

    waitlistNotice:
      "Tarree eegumsaa keessa jirta. Bakki yoo baname Telebirriin kaffaluuf yeroo murtaa'e qabaatta.",

    signInFirst: "Maaloo jalqaba seeni.",

    paymentOfferExpired:
      "Yeroon kaffaltii kanaa darbeera. Qabannaan kee ofumaan haaromfama.",

    // Payment status messages
    paymentSuccessful:
      "Kaffaltiin Telebirr milkaa'eera. Tapha kanaaf bakki kee mirkanaa'eera.",

    paymentSuccessfulShort:
      "Kaffaltiin Telebirr milkaa'eera.",

    paymentFailed:
      "Kaffaltiin Telebirr hin milkoofne. Irra deebi'ii yaaluu dandeessa.",

    waitlistPaymentFailed:
      "Kaffaltiin Telebirr hin milkoofne. Yeroon kaffaltii tarree eegumsaa kee osoo hin xumuramin irra deebi'ii yaaluu dandeessa.",

    waitlistPaymentExpired:
      "Yeroon kaffaltii tarree eegumsaa kee darbeera.",

    waitingForPayment:
      "Kaffaltii Telebirr eegaa jira...",

    paymentStillPending:
      "Kaffaltiin ammallee eegamaa jira. Kaffaltii Telebirr xumuri, sana booda Kaffaltii Mirkaneessi tuqi.",

    paymentStartError:
      "Kaffaltii jalqabuuf yeroo yaalamu rakkoon uumameera.",

    paymentCheckError:
      "Kaffaltii mirkaneessuuf yeroo yaalamu rakkoon uumameera.",

    paymentCouldNotStart:
      "Kaffaltii Telebirr jalqabuun hin danda'amne.",

    bookingCouldNotBeCreated:
      "Qabannaa kee uumuu hin danda'amne.",

    waitlistCouldNotBeJoined:
      "Tarree eegumsaa makamuun hin danda'amne.",

    joinedWaitlist:
      "Tarree eegumsaa keessa jirta.",

    joinedGameSuccessfully:
      "Tapha kana milkaa'inaan makamtetta.",

    // Remaining payment messages
    paymentBookingNotFound:
      "Qabannaa kaffaltii kanaa argachuun hin danda'amne. Haaromsiitii irra deebi'ii yaali.",

    checkingTelebirrPayment:
      "Kaffaltii Telebirr mirkaneessaa jira...",

    paymentVerifyError:
      "Kaffaltii amma mirkaneessuun hin danda'amne. Maaloo irra deebi'ii yaali.",

    refundPending:
      "Kaffaltiin milkaa'eera, garuu taphi haqameera. Maallaqni deebifamuuf adeemsa irra jira.",

    waitlistOfferReleased:
      "Yeroon kaffaltii tarree eegumsaa kee darbeera. Bakki sun gadhiifameera.",

    reservedSpotReleased:
      "Yeroon kaffaltii darbeera. Bakki siif qabame gadhiifameera. Irra deebi'ii yaaluu dandeessa.",

    waitlistBookingNotFound:
      "Qabannaa tarree eegumsaa kee argachuun hin danda'amne. Haaromsiitii irra deebi'ii yaali.",

    startingWaitlistPayment:
      "Bakka tarree eegumsaa keetiif kaffaltii Telebirr jalqabaa jira...",

    startingPayment:
      "Kaffaltii Telebirr jalqabaa jira...",

    paymentReferenceMissing:
      "Kaffaltiin jalqabameera, garuu wabii kaffaltii argachuun hin danda'amne.",

    paymentRequestSent:
      "Gaaffiin Telebirr ergameera. Kaffaltii mirkaneessaa jira...",

    paymentStillVerifying:
      "Kaffaltiin ammallee mirkanaa'aa jira. Irra deebi'ii ilaaluuf Kaffaltii Mirkaneessi tuqi.",
  },

  bookings: {
    title: "Taphoota Koo",
    subtitle: "Taphoota qabatte fi seenaa qabannaa kee",
    loading: "Taphoota kee fe'aa jira...",
    noBookings: "Qabannaan ammatti hin jiru",
    noBookingsDescription:
      "Taphoonni ati makamtuu fi tarree eegumsaa keessa galtu asitti mul'atu.",

    confirmed: "Mirkanaa'eera",
    waitlisted: "Tarree eegumsaa keessa",
    paymentPending: "Kaffaltiin eegamaa jira",
    cancelled: "Haqameera",
    gameCancelled: "Taphi haqameera",

    by: "qopheessaan",

    spotOpened: "Bakki banameera!",
    payBeforeTimer:
      "Yeroon osoo hin xumuramin Telebirriin kaffali.",
    connectingTelebirr:
      "Telebirr waliin wal qunnamsiisaa jira...",
    payWithTelebirr: "Telebirriin Kaffali",

    paymentOfferExpired:
      "Yeroon kaffaltii kanaa darbeera. Qabannaan kee ofumaan haaromfama.",

    spotReserved:
      "Bakki kee yeroo muraasaaf qabameera. Kaffaltii Telebirr yeroo kana keessatti xumuri:",

    telebirrPending:
      "Kaffaltiin Telebirr kee ammallee eegamaa jira. Itti fufuuf haala kaffaltii mirkaneessi.",

    checkingPayment: "Kaffaltii mirkaneessaa jira...",
    checkPayment: "Kaffaltii Mirkaneessi",

    refundOrganizer:
      "ETB deebifameera sababni isaas qopheessaan tapha kana haqeera.",

    organizerRefundPending:
      "Taphi kun qopheessaan haqameera. Maallaqni kee deebifamaa jira.",

    organizerCancelledHistory:
      "Taphi kun qopheessaan haqameera. Qabannaan kun seenaa kee keessatti tura.",

    refundedToPayment:
      "ETB gara mala kaffaltii keetti deebifameera.",

    refundProcessing:
      "Maallaqni kee deebifamaa jira.",

    playerCancelledHistory:
      "Qabannaa kana haqxeetta. Seenaa kee keessatti tura.",

    checkingRefund:
      "Deebii maallaqaa mirkaneessaa jira...",
    retryRefund: "Deebii Maallaqaa Irra Deebi'i",

    leaveWaitlist: "Tarree Eegumsaa Dhiisi",
    cancelBooking: "Qabannaa Haqi",

    leaveWaitlistQuestion:
      "Tarree eegumsaa dhiisuu?",
    cancelBookingQuestion: "Qabannaa haquu?",
    keepBooking: "Qabannaa Tursiisi",

    somethingWentWrong: "Rakkoon uumame:",
    thisGame: "tapha kana",

    leaveWaitlistMessage:
      "Tarree eegumsaa keessaa ba'i:",
    leaveWaitlistHistory:
      "Qabannaan kee seenaa kee keessatti tura.",

    cancelRefundMessage:
      "Bakki kee ni gadhiifama; maallaqni Telebirr akka deebi'u ni gaafatama.",

    cancelNormalMessage:
      "Bakki kee ni gadhiifama; nama tarree eegumsaa keessa jiruuf kennamuu danda'a.",
  },

  profile: {
    title: "Profaayilii",
    subtitle: "Odeeffannoo taphataa kee",

    fullName: "Maqaa Guutuu",
    phone: "Bilbila",
    skillLevel: "Sadarkaa Dandeettii",

    beginner: "Jalqabaa",
    intermediate: "Giddugaleessa",
    advanced: "Olaanaa",

    saveProfile: "Profaayilii Olkaa'i",
    createGame: "Tapha Uumi",
    manageGames: "Taphoota Bulchi",
    signOut: "Ba'i",
    language: "Afaan",

    footballPlayer: "Taphataa Kubbaa Miilaa",
    phoneNumber: "Lakkoofsa bilbilaa",
    admin: "Bulchaa",
    organizer: "Qopheessaa",

    namePlaceholder: "Maqaa kee galchi",
    phoneHelp:
      "Lakkoofsi bilbilaa kee akkaawuntii kee waliin walqabateera.",

    adminTools: "Meeshaalee Bulchaa",
    adminToolsSubtitle:
      "Taphoota kubbaa miilaa bulchi",
    createGameSubtitle:
      "Tapha kubbaa miilaa haaraa dabali",
    manageGamesSubtitle:
      "Taphoota jiran gulaali ykn haqi",

    nameRequired: "Maqaan barbaachisa",
    nameRequiredMessage:
      "Maaloo maqaa kee guutuu galchi.",

    skillRequired:
      "Sadarkaan dandeettii barbaachisa",
    skillRequiredMessage:
      "Maaloo sadarkaa dandeettii kee fili.",

    error: "Dogoggora",
    notLoggedIn:
      "Akkaawuntii keetti hin seenne.",

    couldNotSave:
      "Profaayilii olkaa'uun hin danda'amne",
    saved: "Olkaa'ameera",
    profileUpdated:
      "Profaayilli kee haaromfameera.",

    signOutFailed: "Ba'uun hin milkoofne",
  },

  languages: {
    english: "English",
    amharic: "አማርኛ",
    oromo: "Afaan Oromoo",
  },
};

export default om;