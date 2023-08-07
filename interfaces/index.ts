export interface IngestI {
    match_id?: string;
    timestamp?: string;
    team?: string;
    opponent?: string;
    isTest?: boolean;
    event_type?: string;   
    event_details?: event_detailsI;
}

export interface IngestCreationI {
    match_id?: string;
    date?: string;
    timestamp?: string;
    team?: string;
    opponent?: string;
    events: event_detailsI[];
}

export interface event_detailsI {
    timestamp?: string;
    event_type?: string;  
    event_id?: string;
    player: {
        name?: string;
        position?: string;
        number?: number;
    },
    goal_type?: string;
    minute?: number;
    assist?: {
        name?: string;
        position?: string;
        number?: number;
    },
    video_url?: number;
}