import Tauri
import UIKit
import WebKit
import Contacts

class PingArgs: Decodable {
  let value: String?
}

class ImportContactsPlugin: Plugin {
    @objc public func importContacts(_ invoke: Invoke) throws {
        print("=== IMPORT CONTACTS COMMAND STARTED ===")
        print("Command invoked from Tauri frontend")

        do {
            let contacts = try performContactImport()
            invoke.resolve(["contacts": contacts])
        } catch {
            print("Error importing contacts: \(error)")
            invoke.reject("Failed to import contacts: \(error.localizedDescription)")
        }
    }

    @objc public override func checkPermissions(_ invoke: Invoke) {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        let state = mapAuthorizationStatus(status)
        invoke.resolve(["readContacts": state])
    }

    @objc public override func requestPermissions(_ invoke: Invoke) {
        let store = CNContactStore()
        store.requestAccess(for: .contacts) { granted, error in
            if let error = error {
                invoke.reject("Failed to request contacts permission: \(error.localizedDescription)")
            } else {
                let state = granted ? "granted" : "denied"
                invoke.resolve(["readContacts": state])
            }
        }
    }

    private func mapAuthorizationStatus(_ status: CNAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "granted"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "prompt"
        @unknown default: return "prompt"
        }
    }

    private func performContactImport() throws -> [[String: Any?]] {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        guard status == .authorized else {
            throw NSError(domain: "ContactsError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Contacts permission not granted"])
        }

        print("Permission granted - proceeding with contact import")

        let store = CNContactStore()
        let keysToFetch: [any CNKeyDescriptor] = [
            CNContactIdentifierKey,
            CNContactGivenNameKey,
            CNContactFamilyNameKey,
            CNContactMiddleNameKey,
            CNContactNamePrefixKey,
            CNContactNameSuffixKey,
            CNContactNicknameKey,
            CNContactPhoneNumbersKey,
            CNContactEmailAddressesKey,
            CNContactPostalAddressesKey,
            CNContactOrganizationNameKey,
            CNContactJobTitleKey,
            CNContactDepartmentNameKey,
            CNContactUrlAddressesKey,
            // CNContactNoteKey,
            // CNContactBirthdayKey,
            // CNContactDatesKey,
            // CNContactRelationsKey
        ] as [CNKeyDescriptor]

        // let keys: [any CNKeyDescriptor] = [ 
        //  CNContactIdentifierKey, CNContactTypeKey, CNContactPropertyAttribute,
        //  CNContactNamePrefixKey, CNContactGivenNameKey, CNContactMiddleNameKey,
        //  CNContactFamilyNameKey, CNContactPreviousFamilyNameKey, CNContactNameSuffixKey,
        //  CNContactNicknameKey, CNContactPhoneticGivenNameKey, CNContactPhoneticMiddleNameKey,
        //  CNContactPhoneticFamilyNameKey, CNContactJobTitleKey, CNContactDepartmentNameKey,
        //  CNContactOrganizationNameKey, CNContactPhoneticOrganizationNameKey, CNContactPostalAddressesKey,
        //  CNContactEmailAddressesKey, CNContactUrlAddressesKey, CNContactInstantMessageAddressesKey,
        //  CNContactPhoneNumbersKey, CNContactSocialProfilesKey, CNContactBirthdayKey, CNContactDatesKey,
        //  CNContactImageDataKey, CNContactThumbnailImageDataKey, CNContactImageDataAvailableKey,
        //  CNContactRelationsKey, CNGroupNameKey, CNGroupIdentifierKey, CNContainerNameKey,
        //  CNContainerTypeKey, CNInstantMessageAddressServiceKey, CNInstantMessageAddressUsernameKey,
        //  CNSocialProfileServiceKey, CNSocialProfileURLStringKey, CNSocialProfileUsernameKey,
        //  CNSocialProfileUserIdentifierKey,
        //  CNContactFormatter.descriptorForRequiredKeys(for: .fullName),
        //  CNContactFormatter.descriptorForRequiredKeys(for: .phoneticFullName)]  as? [CNKeyDescriptor] ?? []

        let request = CNContactFetchRequest(keysToFetch: keysToFetch)
        var contacts: [[String: Any?]] = []

        try store.enumerateContacts(with: request) { (contact, stop) in
            if let transformedContact = self.transformToContact(contact) {
                contacts.append(transformedContact)
            }
        }

        print("Successfully imported \(contacts.count) contacts")
        return contacts
    }

    private func transformToContact(_ contact: CNContact) -> [String: Any?]? {
        var contactMap: [String: Any?] = [:]

        // Name
        if contact.isKeyAvailable(CNContactGivenNameKey) || contact.isKeyAvailable(CNContactFamilyNameKey) {
            let givenName = contact.isKeyAvailable(CNContactGivenNameKey) ? contact.givenName : ""
            let familyName = contact.isKeyAvailable(CNContactFamilyNameKey) ? contact.familyName : ""
            
            if !givenName.isEmpty || !familyName.isEmpty {
                var nameItem: [String: Any] = [
                    "value": "\(givenName) \(familyName)".trimmingCharacters(in: .whitespaces),
                    "source": "iOS Device",
                    "firstName": givenName,
                    "familyName": familyName
                ]
                
                if contact.isKeyAvailable(CNContactMiddleNameKey) {
                    nameItem["middleName"] = contact.middleName
                }
                if contact.isKeyAvailable(CNContactNamePrefixKey) {
                    nameItem["honorificPrefix"] = contact.namePrefix
                }
                if contact.isKeyAvailable(CNContactNameSuffixKey) {
                    nameItem["honorificSuffix"] = contact.nameSuffix
                }
                
                contactMap["name"] = [nameItem]
            }
        }

        // Nickname
        if contact.isKeyAvailable(CNContactNicknameKey) && !contact.nickname.isEmpty {
            contactMap["nickname"] = [[
                "value": contact.nickname,
                "source": "iOS Device"
            ]]
        }

        // Phone numbers
        if contact.isKeyAvailable(CNContactPhoneNumbersKey) && !contact.phoneNumbers.isEmpty {
            let phoneItems = contact.phoneNumbers.map { phoneNumber -> [String: Any] in
                var phoneItem: [String: Any] = [
                    "value": phoneNumber.value.stringValue,
                    "source": "iOS Device"
                ]
                if let label = phoneNumber.label {
                    phoneItem["type2"] = self.mapPhoneLabel(label)
                }
                return phoneItem
            }
            contactMap["phoneNumber"] = phoneItems
        }

        // Email addresses
        if contact.isKeyAvailable(CNContactEmailAddressesKey) && !contact.emailAddresses.isEmpty {
            let emailItems = contact.emailAddresses.map { email -> [String: Any] in
                var emailItem: [String: Any] = [
                    "value": email.value as String,
                    "source": "iOS Device"
                ]
                if let label = email.label {
                    emailItem["type2"] = self.mapEmailLabel(label)
                }
                return emailItem
            }
            contactMap["email"] = emailItems
        }

        // Postal addresses
        if contact.isKeyAvailable(CNContactPostalAddressesKey) && !contact.postalAddresses.isEmpty {
            let addressItems = contact.postalAddresses.map { address -> [String: Any] in
                let postalAddress = address.value
                var addressItem: [String: Any] = [
                    "value": CNPostalAddressFormatter.string(from: postalAddress, style: .mailingAddress),
                    "source": "iOS Device",
                    "streetAddress": postalAddress.street,
                    "city": postalAddress.city,
                    "region": postalAddress.state,
                    "postalCode": postalAddress.postalCode,
                    "country": postalAddress.country,
                    "isoCountryCode": postalAddress.isoCountryCode
                ]
                if let label = address.label {
                    addressItem["type2"] = self.mapAddressLabel(label)
                }
                return addressItem
            }
            contactMap["address"] = addressItems
        }

        // Organization
        if contact.isKeyAvailable(CNContactOrganizationNameKey) && !contact.organizationName.isEmpty {
            var orgItem: [String: Any] = [
                "value": contact.organizationName,
                "source": "iOS Device"
            ]
            if contact.isKeyAvailable(CNContactJobTitleKey) && !contact.jobTitle.isEmpty {
                orgItem["position"] = contact.jobTitle
            }
            if contact.isKeyAvailable(CNContactDepartmentNameKey) && !contact.departmentName.isEmpty {
                orgItem["department"] = contact.departmentName
            }
            contactMap["organization"] = [orgItem]
        }

        // URLs
        if contact.isKeyAvailable(CNContactUrlAddressesKey) && !contact.urlAddresses.isEmpty {
            let urlItems = contact.urlAddresses.map { url -> [String: Any] in
                var urlItem: [String: Any] = [
                    "value": url.value as String,
                    "source": "iOS Device"
                ]
                if let label = url.label {
                    urlItem["type2"] = self.mapURLLabel(label)
                }
                return urlItem
            }
            contactMap["url"] = urlItems
        }

        // Biography/Note
        if contact.isKeyAvailable(CNContactNoteKey) && !contact.note.isEmpty {
            contactMap["biography"] = [[
                "value": contact.note,
                "source": "iOS Device"
            ]]
        }

        // Birthday
        if contact.isKeyAvailable(CNContactBirthdayKey), let birthday = contact.birthday {
            if let date = Calendar.current.date(from: birthday) {
                let dateFormatter = DateFormatter()
                dateFormatter.dateFormat = "yyyy-MM-dd"
                contactMap["event"] = [[
                    "value": dateFormatter.string(from: date),
                    "source": "iOS Device",
                    "type2": "birthday"
                ]]
            }
        }

        // Relations
        if contact.isKeyAvailable(CNContactRelationsKey) && !contact.contactRelations.isEmpty {
            let relationItems = contact.contactRelations.map { relation -> [String: Any] in
                var relationItem: [String: Any] = [
                    "value": relation.value.name,
                    "source": "iOS Device"
                ]
                if let label = relation.label {
                    relationItem["type2"] = self.mapRelationLabel(label)
                }
                return relationItem
            }
            contactMap["relation"] = relationItems
        }

        // Dates (anniversaries, etc.)
        if contact.isKeyAvailable(CNContactDatesKey) && !contact.dates.isEmpty {
            let dateItems = contact.dates.compactMap { date -> [String: Any]? in
                guard let dateValue = date.value.date else { return nil }
                let dateFormatter = DateFormatter()
                dateFormatter.dateFormat = "yyyy-MM-dd"
                var dateItem: [String: Any] = [
                    "value": dateFormatter.string(from: dateValue),
                    "source": "iOS Device"
                ]
                if let label = date.label {
                    dateItem["type2"] = self.mapDateLabel(label)
                }
                return dateItem
            }
            if !dateItems.isEmpty {
                contactMap["event"] = (contactMap["event"] as? [[String: Any]] ?? []) + dateItems
            }
        }

        // Headline (job title at organization) - Check keys again just to be safe
        if contact.isKeyAvailable(CNContactJobTitleKey) && contact.isKeyAvailable(CNContactOrganizationNameKey) {
             if !contact.jobTitle.isEmpty && !contact.organizationName.isEmpty {
                contactMap["headline"] = [[
                    "value": "\(contact.jobTitle) at \(contact.organizationName)",
                    "source": "iOS Device"
                ]]
            }
        }

        // Timestamps
        let currentDateTime = ISO8601DateFormatter().string(from: Date())
        let timestampData: [String: String] = [
            "valueDateTime": currentDateTime,
            "source": "system"
        ]
        contactMap["createdAt"] = timestampData
        contactMap["updatedAt"] = timestampData

        return contactMap.isEmpty ? nil : contactMap
    }

    private func mapPhoneLabel(_ label: String) -> String {
        switch label {
        case CNLabelHome: return "home"
        case CNLabelWork: return "work"
        case CNLabelPhoneNumberMobile: return "mobile"
        case CNLabelPhoneNumberiPhone: return "mobile" // Map iPhone to mobile
        case CNLabelPhoneNumberMain: return "main"
        case CNLabelPhoneNumberHomeFax: return "homeFax"
        case CNLabelPhoneNumberWorkFax: return "workFax"
        case CNLabelPhoneNumberOtherFax: return "otherFax"
        case CNLabelPhoneNumberPager: return "pager"
        case CNLabelOther: return "other"
        default:
             return "other"
        }
    }

    private func mapEmailLabel(_ label: String) -> String {
        switch label {
        case CNLabelHome: return "home"
        case CNLabelWork: return "work"
        case CNLabelOther: return "other"
        case CNLabelEmailiCloud: return "icloud"
        default: return "other"
        }
    }

    private func mapAddressLabel(_ label: String) -> String {
        switch label {
        case CNLabelHome: return "home"
        case CNLabelWork: return "work"
        case CNLabelOther: return "other"
        default: return "other"
        }
    }

    private func mapURLLabel(_ label: String) -> String {
        switch label {
        case CNLabelHome: return "home"
        case CNLabelWork: return "work"
        case CNLabelOther: return "other"
        case CNLabelURLAddressHomePage: return "homePage"
        default: return "other"
        }
    }

    private func mapRelationLabel(_ label: String) -> String {
        switch label {
        case CNLabelContactRelationFather: return "father"
        case CNLabelContactRelationMother: return "mother"
        case CNLabelContactRelationParent: return "parent"
        case CNLabelContactRelationBrother: return "brother"
        case CNLabelContactRelationSister: return "sister"
        case CNLabelContactRelationChild: return "child"
        case CNLabelContactRelationFriend: return "friend"
        case CNLabelContactRelationSpouse: return "spouse"
        case CNLabelContactRelationPartner: return "partner"
        case CNLabelContactRelationManager: return "manager"
        case CNLabelContactRelationAssistant: return "assistant"
        case CNLabelOther: return "other"
        default: return "other"
        }
    }

    private func mapDateLabel(_ label: String) -> String {
        switch label {
        case CNLabelDateAnniversary: return "anniversary"
        case CNLabelOther: return "other"
        default: return "other"
        }
    }

}

@_cdecl("init_plugin_contacts_importer")
func initPlugin() -> Plugin {
  return ImportContactsPlugin()
}
