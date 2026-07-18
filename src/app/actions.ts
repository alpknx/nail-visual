// Re-exports the server actions defined in ./actions/*, grouped by domain
// (onboarding, tags, posts, schedule, bookings). Kept as a barrel so the many
// existing `from "@/app/actions"` import sites don't need to change - new code
// should prefer importing directly from the domain module it needs.

export { completeOnboarding, getProfile, updateProfile } from "./actions/onboarding";

export { searchTags, getTagById, getTags, getAllTags } from "./actions/tags";

export {
  getFeedPosts,
  getMatchingMasters,
  createPost,
  updatePostDetails,
  deletePost,
} from "./actions/posts";

export {
  getMasterSchedule,
  upsertMasterSchedule,
  createMasterOverride,
  deleteMasterOverride,
  getMasterOverrides,
  getAvailableSlotsAction,
} from "./actions/schedule";

export {
  previewBooking,
  createBooking,
  cancelBooking,
  getClientBookings,
  getMasterBookings,
  confirmBooking,
  cancelBookingByMaster,
  getMasterCalendarData,
} from "./actions/bookings";
