/**
 * Picker value standing for "ridden on a bike I don't own": a demo, a loaner,
 * a rental, a friend's bike.
 *
 * It occupies the same slot as a bike id because the states are mutually
 * exclusive (a ride is on one of your bikes, on none, or on someone else's),
 * and screens map it to the `unownedBike` flag with a null bikeId on submit.
 * The double underscores keep it clear of any real uuid.
 *
 * Shared so the ride detail picker, the edit form and the manual add form all
 * agree on one value rather than each carrying its own copy.
 */
export const UNOWNED_BIKE_VALUE = '__unowned__';
