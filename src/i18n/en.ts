const en = {
  common: {
    appName: "Addis Football",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    retry: "Retry",
    error: "Something went wrong",
  },

  tabs: {
    discover: "Discover",
    bookings: "Bookings",
    profile: "Profile",
  },

  discover: {
    title: "Discover",
    subtitle: "Play football in Addis Ababa",
    searchPlaceholder: "Search games, venues or areas",

    today: "Today",
    tomorrow: "Tomorrow",

    games: "Games",
    game: "game",
    gamesCount: "games",

    findingGames: "Finding games...",
    noGamesFound: "No games found",
    noGamesForDay:
      "There are no upcoming games scheduled for this day yet.",
    noSearchResults:
      "Try another search or choose a different day.",

    available: "Available",
    full: "Full",
    cancelled: "Cancelled",
    spotsLeft: "spots left",
    joinGame: "Join Game",
    joinWaitlist: "Join Waitlist",
    payWithTelebirr: "Pay with Telebirr",
  },

  gameCard: {
    gameFull: "Game full",
    confirmed: "Confirmed",
    by: "by",
    spotsLeft: "spots left",
    free: "FREE",

    allLevels: "All Levels",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",

    joined: "Joined",
    waitlisted: "Waitlisted",
    joinGame: "Join Game",
    joinWaitlist: "Join Waitlist",
    joining: "Joining...",
    joiningWaitlist: "Joining Waitlist...",

    connectingTelebirr: "Connecting to Telebirr...",
    checkingPayment: "Checking Payment...",
    checkPayment: "Check Payment",
    payWithTelebirr: "Pay with Telebirr",

    offerExpired: "Offer Expired",
    spotOpened: "A spot opened!",

    offerExpiredDescription:
      "The payment window for this spot has ended. Your booking will update automatically.",

    reservedDescription:
      "Your spot is temporarily reserved. Complete the Telebirr payment before the timer ends.",

    waitlistNotice:
      "You're on the waitlist. If a spot opens, you'll have a limited time to pay with Telebirr.",

    signInFirst: "Please sign in first.",

    paymentOfferExpired:
      "This payment offer has expired. Your booking will update automatically.",

    // Payment status messages
    paymentSuccessful:
      "Telebirr payment successful. You're confirmed for this game.",

    paymentSuccessfulShort:
      "Telebirr payment successful.",

    paymentFailed:
      "Telebirr payment failed. You can try again.",

    waitlistPaymentFailed:
      "Telebirr payment failed. You can try again while your waitlist offer is still active.",

    waitlistPaymentExpired:
      "Your waitlist payment offer has expired.",

    waitingForPayment:
      "Waiting for Telebirr payment...",

    paymentStillPending:
      "Payment is still pending. Complete the Telebirr authorization, then tap Check Payment.",

    paymentStartError:
      "Something went wrong while starting the payment.",

    paymentCheckError:
      "Something went wrong while checking the payment.",

    paymentCouldNotStart:
      "Could not start the Telebirr payment.",

    bookingCouldNotBeCreated:
      "Could not create your booking.",

    waitlistCouldNotBeJoined:
      "Could not join the waitlist.",

    joinedWaitlist:
      "You're on the waitlist.",

    joinedGameSuccessfully:
      "You joined the game successfully.",

    // Remaining payment messages
    paymentBookingNotFound:
      "Could not find this payment booking. Refresh and try again.",

    checkingTelebirrPayment:
      "Checking Telebirr payment...",

    paymentVerifyError:
      "Could not verify the payment right now. Please try again.",

    refundPending:
      "Payment succeeded, but the game was cancelled. Refund is pending.",

    waitlistOfferReleased:
      "Your waitlist payment offer expired. The spot has been released.",

    reservedSpotReleased:
      "Payment expired. Your reserved spot was released. You can try again.",

    waitlistBookingNotFound:
      "Could not find your waitlist booking. Refresh and try again.",

    startingWaitlistPayment:
      "Starting Telebirr payment for your waitlist spot...",

    startingPayment:
      "Starting Telebirr payment...",

    paymentReferenceMissing:
      "Payment started, but the payment reference is missing.",

    paymentRequestSent:
      "Telebirr request sent. Checking payment...",

    paymentStillVerifying:
      "Payment is still being verified. Tap Check Payment to check again.",
  },

  bookings: {
    title: "Bookings",
    subtitle: "Your games and booking history",
    loading: "Loading your games...",
    noBookings: "No bookings yet",
    noBookingsDescription:
      "Games you join or waitlist will appear here.",

    confirmed: "Confirmed",
    waitlisted: "Waitlisted",
    paymentPending: "Payment Pending",
    cancelled: "Cancelled",
    gameCancelled: "Game Cancelled",

    by: "by",

    spotOpened: "A spot opened!",
    payBeforeTimer:
      "Pay with Telebirr before the timer ends to secure your spot.",
    connectingTelebirr:
      "Connecting to Telebirr...",
    payWithTelebirr: "Pay with Telebirr",

    paymentOfferExpired:
      "This payment offer expired. Your booking will update automatically.",

    spotReserved:
      "Your spot is temporarily reserved. Complete your Telebirr payment within",

    telebirrPending:
      "Your Telebirr payment is still pending. Check the payment status to continue.",

    checkingPayment: "Checking Payment...",
    checkPayment: "Check Payment",

    refundOrganizer:
      "ETB was refunded because the organizer cancelled this game.",

    organizerRefundPending:
      "This game was cancelled by the organizer. Your refund is being processed.",

    organizerCancelledHistory:
      "This game was cancelled by the organizer. The booking remains in your history.",

    refundedToPayment:
      "ETB was refunded to your payment method.",

    refundProcessing:
      "Your refund is being processed.",

    playerCancelledHistory:
      "You cancelled this booking. It remains here for your history.",

    checkingRefund: "Checking Refund...",
    retryRefund: "Retry Refund",

    leaveWaitlist: "Leave Waitlist",
    cancelBooking: "Cancel Booking",

    leaveWaitlistQuestion: "Leave Waitlist?",
    cancelBookingQuestion: "Cancel Booking?",
    keepBooking: "Keep Booking",

    somethingWentWrong: "Something went wrong:",
    thisGame: "this game",

    leaveWaitlistMessage:
      "Leave the waitlist for",

    leaveWaitlistHistory:
      "Your booking will remain in your history.",

    cancelRefundMessage:
      "Your spot will be released and a Telebirr refund will be requested.",

    cancelNormalMessage:
      "Your spot will be released and may be given to someone on the waitlist.",
  },

  profile: {
    title: "Profile",
    subtitle: "Your player information",

    fullName: "Full Name",
    phone: "Phone",
    skillLevel: "Skill Level",

    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",

    saveProfile: "Save Profile",
    createGame: "Create Game",
    manageGames: "Manage Games",
    signOut: "Sign Out",
    language: "Language",

    footballPlayer: "Football Player",
    phoneNumber: "Phone number",
    admin: "Admin",
    organizer: "Organizer",

    namePlaceholder: "Enter your name",
    phoneHelp:
      "Your phone number is connected to your account.",

    adminTools: "Admin Tools",
    adminToolsSubtitle:
      "Manage football games",

    createGameSubtitle:
      "Add a new football game",

    manageGamesSubtitle:
      "Edit or cancel existing games",

    nameRequired: "Name required",
    nameRequiredMessage:
      "Please enter your full name.",

    skillRequired: "Skill level required",
    skillRequiredMessage:
      "Please select your skill level.",

    error: "Error",
    notLoggedIn:
      "You are not logged in.",

    couldNotSave:
      "Could not save profile",

    saved: "Saved",

    profileUpdated:
      "Your profile has been updated.",

    signOutFailed:
      "Sign out failed",
  },

  languages: {
    english: "English",
    amharic: "አማርኛ",
    oromo: "Afaan Oromoo",
  },
};

export default en;