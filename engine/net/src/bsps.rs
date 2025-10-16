use lazy_static::lazy_static;
use std::collections::HashMap;
use time::{Date, Month};

pub struct BSPDetail<'a> {
    pub domain: &'a str,
    // ISO-2 code
    pub country: &'a str,
    // email address of sys admin
    pub sysadmin: &'a str,
    // owned or rented
    pub owned: bool,
    pub since: Date,
    pub has_free: bool,
    pub has_paid: bool,
    pub official: bool,
    pub description: &'a str,
}

lazy_static! {
    pub static ref BSP_DETAILS: HashMap<&'static str, BSPDetail<'static>> = {
        let mut d = HashMap::new();

        d.insert(
            "https://nextgraph.eu",
            BSPDetail {
                domain: "nextgraph.eu",
                country: "de",
                sysadmin: "team@nextgraph.org",
                owned: false,
                since: Date::from_calendar_date(2024, Month::September, 2).unwrap(),
                has_free: true,
                has_paid: false,
                official: true,
                description:
                    "First official Broker Service Provider from NextGraph.org. Based in Europe.",
            },
        );

        assert!(d.insert("https://nextgraph.one", BSPDetail {
            domain: "nextgraph.one",
            country: "de",
            sysadmin: "team@nextgraph.org",
            owned: false,
            since: Date::from_calendar_date(2025, Month::April,20).unwrap(),
            has_free: true,
            has_paid: false,
            official: true,
            description: "Second official Broker Service Provider from NextGraph.org. Based in Europe, but that could change."
        }).is_none());

        d
    };
    pub static ref BSP_ORIGINS: Vec<&'static str> = BSP_DETAILS.keys().cloned().collect();
}
