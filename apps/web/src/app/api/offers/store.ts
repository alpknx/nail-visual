export type OfferStatus = "offer" | "accepted" | "declined";

export type Offer = {
    id: string;
    referenceId: string;
    proId: string;
    message?: string;
    pricePln?: number;
    status: OfferStatus;
    createdAt: string;
};


export const OFFERS: Offer[] = [];
