package com.plugin.contactsImporter

import android.Manifest
import android.app.Activity
import android.database.Cursor
import android.provider.ContactsContract
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.annotation.Permission
import app.tauri.plugin.JSObject
import app.tauri.plugin.JSArray
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import org.json.JSONObject
import kotlin.text.isNullOrEmpty

data class Contact(
    val name: List<Map<String, Any>>? = null,
    val phoneNumber: List<Map<String, Any>>? = null,
    val email: List<Map<String, Any>>? = null,
    val address: List<Map<String, Any>>? = null,
    val organization: List<Map<String, Any>>? = null,
    val url: List<Map<String, Any>>? = null,
    val biography: List<Map<String, Any>>? = null,
    val event: List<Map<String, Any>>? = null,
    val nickname: List<Map<String, Any>>? = null,
    val relation: List<Map<String, Any>>? = null,
    val contactImportGroup: List<Map<String, Any>>? = null,
    val headline: List<Map<String, Any>>? = null,
    val createdAt: Map<String, String>? = null,
    val updatedAt: Map<String, String>? = null
) {
    // Custom equals to determine duplicates based on core identifying fields
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Contact) return false

        // Consider contacts duplicate if they have same name AND (phone OR email)
        val thisName = name?.firstOrNull()?.get("value") as? String
        val otherName = other.name?.firstOrNull()?.get("value") as? String

        val thisPhone = phoneNumber?.firstOrNull()?.get("value") as? String
        val otherPhone = other.phoneNumber?.firstOrNull()?.get("value") as? String

        val thisEmail = email?.firstOrNull()?.get("value") as? String
        val otherEmail = other.email?.firstOrNull()?.get("value") as? String

        return thisName == otherName && (
            (thisPhone != null && thisPhone == otherPhone) ||
            (thisEmail != null && thisEmail == otherEmail)
        )
    }

    override fun hashCode(): Int {
        val name = name?.firstOrNull()?.get("value") as? String
        val phone = phoneNumber?.firstOrNull()?.get("value") as? String
        val email = email?.firstOrNull()?.get("value") as? String

        return (name?.hashCode() ?: 0) * 31 +
               (phone?.hashCode() ?: email?.hashCode() ?: 0)
    }
}

@TauriPlugin(
    permissions = [
        Permission(
            strings = [Manifest.permission.READ_CONTACTS],
            alias = "readContacts"
        )
    ]
)
class ImportContactsPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    override fun checkPermissions(invoke: Invoke) {
        super.checkPermissions(invoke)
    }

    @Command
    override fun requestPermissions(invoke: Invoke) {
        super.requestPermissions(invoke)
    }

    @Command
    fun importContacts(invoke: Invoke) {
        Log.d("ContactImporter", "=== IMPORT CONTACTS COMMAND STARTED ===")
        Log.i("ContactImporter", "Command invoked from Tauri frontend")

        try {
            val contacts = performContactImport()

            // Convert to JSON properly
            val contactsArray = JSArray()
            contacts.forEach { contact ->
                contactsArray.put(mapToJSObject(contact))
            }

            val result = JSObject()
            result.put("contacts", contactsArray)
            invoke.resolve(result)
        } catch (e: Exception) {
            Log.e("ContactImporter", "Error importing contacts", e)
            invoke.reject("Failed to import contacts: ${e.message}")
        }
    }

    private fun performContactImport(): List<Map<String, Any?>> {
        Log.i("ContactImporter", "Permission granted - proceeding with contact import")

        val contactIds = getContactIds()
        Log.d("ContactImporter", "Found ${contactIds.size} unique contacts")

        val contactPOJOs = mutableListOf<Contact>()

        contactIds.forEach { contactId ->
            Log.d("ContactImporter", "Processing contact ID: $contactId")

            val contact = transformToNaoContact(contactId)
            if (contact != null) {
                contactPOJOs.add(contact)
            }
        }

        // Apply distinct() to remove duplicates based on our custom equals/hashCode
        val uniqueContacts = contactPOJOs.distinct()
        Log.d("ContactImporter", "Filtered ${contactPOJOs.size} contacts down to ${uniqueContacts.size} unique contacts")

        // Convert back to Map format for JSON serialization
        val contactMaps = uniqueContacts.map { contact ->
            mutableMapOf<String, Any?>().apply {
                contact.name?.let { put("name", it) }
                contact.phoneNumber?.let { put("phoneNumber", it) }
                contact.email?.let { put("email", it) }
                contact.address?.let { put("address", it) }
                contact.organization?.let { put("organization", it) }
                contact.url?.let { put("url", it) }
                contact.biography?.let { put("biography", it) }
                contact.event?.let { put("event", it) }
                contact.nickname?.let { put("nickname", it) }
                contact.relation?.let { put("relation", it) }
                contact.contactImportGroup?.let { put("contactImportGroup", it) }
                contact.headline?.let { put("headline", it) }
                contact.createdAt?.let { put("createdAt", it) }
                contact.updatedAt?.let { put("updatedAt", it) }
            }
        }

        Log.d("ContactImporter", "Successfully imported ${contactMaps.size} unique contacts")
        return contactMaps
    }

    /**
     * Creates a map for an item, including a primary "value", a "source",
     * and other specified optional fields.
     *
     * @param itemData The map containing the raw data for this item (e.g., from a Cursor).
     * @param valueKey The key in `itemData` to use for the primary "value" field in the output.
     * @param optionalFieldsMap A map where keys are data keys from `itemData` and
     *                          values are the desired output keys in the resulting map.
     * @return A map representing the structured item, or null if the primary value is null or empty.
     */
    private fun buildStructuredItemMap(
        itemData: Map<String, Any?>,
        valueKey: String,
        optionalFieldsMap: Map<String, String> = emptyMap() // Key in itemData -> Key in outputMap
    ): Map<String, String>? {
        val primaryValue = itemData[valueKey] as? String
        if (primaryValue.isNullOrEmpty()) {
            return null // Don't create an item if the primary value is missing
        }

        val itemMap = mutableMapOf(
            "value" to primaryValue,
            "source" to "Android Phone"
        )

        optionalFieldsMap.forEach { (dataKey, outputKey) ->
            (itemData[dataKey] as? String)?.takeIf { it.isNotEmpty() }?.let {
                itemMap[outputKey] = it
            }
        }
        return itemMap
    }

    data class FieldConfiguration(
        val mimeType: String,
        val outputKey: String,
        val primaryValueColumn: String,
        val optionalFields: Map<String, String> = emptyMap(),
        val typeMapping: Map<Int, String>? = null,
        val customTypeColumn: String? = null,
        val typeColumn: String? = null,
        val customProcessor: ((Map<String, Any?>) -> Map<String, Any>?)? = null
    )

    private val fieldConfigurations = listOf(
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE,
            outputKey = "name",
            primaryValueColumn = ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME,
            optionalFields = mapOf(
                ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME to "firstName",
                ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME to "familyName",
                ContactsContract.CommonDataKinds.StructuredName.MIDDLE_NAME to "middleName",
                ContactsContract.CommonDataKinds.StructuredName.PREFIX to "honorificPrefix",
                ContactsContract.CommonDataKinds.StructuredName.SUFFIX to "honorificSuffix",
                ContactsContract.CommonDataKinds.StructuredName.PHONETIC_GIVEN_NAME to "phoneticGivenName",
                ContactsContract.CommonDataKinds.StructuredName.PHONETIC_MIDDLE_NAME to "phoneticMiddleName",
                ContactsContract.CommonDataKinds.StructuredName.PHONETIC_FAMILY_NAME to "phoneticFamilyName"
            )
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE,
            outputKey = "phoneNumber",
            primaryValueColumn = ContactsContract.CommonDataKinds.Phone.NUMBER,
            typeColumn = ContactsContract.CommonDataKinds.Phone.TYPE,
            customProcessor = { phoneData ->
                val phoneNumber =
                    phoneData[ContactsContract.CommonDataKinds.Phone.NUMBER] as? String
                val primaryPhoneNumber = if (phoneNumber.isNullOrEmpty()) {
                    phoneData[ContactsContract.CommonDataKinds.Phone.NORMALIZED_NUMBER] as? String
                } else {
                    phoneNumber
                }

                if (!primaryPhoneNumber.isNullOrEmpty()) {
                    val phoneMap = mutableMapOf<String, Any>(
                        "value" to primaryPhoneNumber,
                        "source" to "Android Phone"
                    )

                    // Handle type information
                    val data2Value = phoneData[ContactsContract.CommonDataKinds.Phone.TYPE]
                    val typeInt = when (data2Value) {
                        is Int -> data2Value
                        is String -> data2Value.toIntOrNull()
                        else -> null
                    }
                    val customLabel = phoneData[ContactsContract.CommonDataKinds.Phone.LABEL] as? String

                    if (typeInt != null) {
                        val typeMapping = mapOf(
                            ContactsContract.CommonDataKinds.Phone.TYPE_HOME to "home",
                            ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE to "mobile",
                            ContactsContract.CommonDataKinds.Phone.TYPE_WORK to "work",
                            ContactsContract.CommonDataKinds.Phone.TYPE_FAX_WORK to "workFax",
                            ContactsContract.CommonDataKinds.Phone.TYPE_FAX_HOME to "homeFax",
                            ContactsContract.CommonDataKinds.Phone.TYPE_OTHER to "other",
                            ContactsContract.CommonDataKinds.Phone.TYPE_CALLBACK to "callback",
                            ContactsContract.CommonDataKinds.Phone.TYPE_CAR to "car",
                            ContactsContract.CommonDataKinds.Phone.TYPE_COMPANY_MAIN to "companyMain",
                            ContactsContract.CommonDataKinds.Phone.TYPE_ISDN to "isdn",
                            ContactsContract.CommonDataKinds.Phone.TYPE_MAIN to "main",
                            ContactsContract.CommonDataKinds.Phone.TYPE_OTHER_FAX to "otherFax",
                            ContactsContract.CommonDataKinds.Phone.TYPE_RADIO to "radio",
                            ContactsContract.CommonDataKinds.Phone.TYPE_TELEX to "telex",
                            ContactsContract.CommonDataKinds.Phone.TYPE_TTY_TDD to "ttyTdd",
                            ContactsContract.CommonDataKinds.Phone.TYPE_WORK_MOBILE to "workMobile",
                            ContactsContract.CommonDataKinds.Phone.TYPE_WORK_PAGER to "workPager",
                            ContactsContract.CommonDataKinds.Phone.TYPE_ASSISTANT to "assistant",
                            ContactsContract.CommonDataKinds.Phone.TYPE_MMS to "mms",
                            ContactsContract.CommonDataKinds.Phone.TYPE_CUSTOM to "other"
                        )
                        phoneMap["type"] = this@ImportContactsPlugin.getTypeString(typeInt, null, typeMapping)
                    }

                    phoneMap
                } else null
            }
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE,
            outputKey = "email",
            primaryValueColumn = ContactsContract.CommonDataKinds.Email.ADDRESS,
            optionalFields = mapOf(
                ContactsContract.CommonDataKinds.Email.DISPLAY_NAME to "displayName"
            ),
            typeColumn = ContactsContract.CommonDataKinds.Email.TYPE,
            typeMapping = mapOf(
                ContactsContract.CommonDataKinds.Email.TYPE_HOME to "home",
                ContactsContract.CommonDataKinds.Email.TYPE_MOBILE to "mobile",
                ContactsContract.CommonDataKinds.Email.TYPE_WORK to "work",
                ContactsContract.CommonDataKinds.Email.TYPE_OTHER to "other",
                ContactsContract.CommonDataKinds.Email.TYPE_CUSTOM to "custom"
            ),
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_ITEM_TYPE,
            outputKey = "address",
            primaryValueColumn = ContactsContract.CommonDataKinds.StructuredPostal.FORMATTED_ADDRESS,
            typeColumn = ContactsContract.CommonDataKinds.StructuredPostal.TYPE,
            typeMapping = mapOf(
                ContactsContract.CommonDataKinds.StructuredPostal.TYPE_HOME to "home",
                ContactsContract.CommonDataKinds.StructuredPostal.TYPE_WORK to "work",
                ContactsContract.CommonDataKinds.StructuredPostal.TYPE_OTHER to "other",
                ContactsContract.CommonDataKinds.StructuredPostal.TYPE_CUSTOM to "custom"
            ),
            optionalFields = mapOf(
                ContactsContract.CommonDataKinds.StructuredPostal.POBOX to "poBox",
                ContactsContract.CommonDataKinds.StructuredPostal.STREET to "streetAddress",
                ContactsContract.CommonDataKinds.StructuredPostal.CITY to "city",
                ContactsContract.CommonDataKinds.StructuredPostal.REGION to "region",
                ContactsContract.CommonDataKinds.StructuredPostal.POSTCODE to "postalCode",
                ContactsContract.CommonDataKinds.StructuredPostal.COUNTRY to "country",
            )
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE,
            outputKey = "organization",
            primaryValueColumn = ContactsContract.CommonDataKinds.Organization.COMPANY,
            typeColumn = ContactsContract.CommonDataKinds.Organization.TYPE,
            typeMapping = mapOf(
                ContactsContract.CommonDataKinds.Organization.TYPE_WORK to "work",
                ContactsContract.CommonDataKinds.Organization.TYPE_OTHER to "other",
                ContactsContract.CommonDataKinds.Organization.TYPE_CUSTOM to "custom"
            ),
            optionalFields = mapOf(
                ContactsContract.CommonDataKinds.Organization.PHONETIC_NAME to "phoneticName",
                ContactsContract.CommonDataKinds.Organization.PHONETIC_NAME_STYLE to "phoneticNameStyle",
                ContactsContract.CommonDataKinds.Organization.DEPARTMENT to "department",
                ContactsContract.CommonDataKinds.Organization.TITLE to "position",
                ContactsContract.CommonDataKinds.Organization.JOB_DESCRIPTION to "jobDescription",
                ContactsContract.CommonDataKinds.Organization.SYMBOL to "symbol",
                ContactsContract.CommonDataKinds.Organization.OFFICE_LOCATION to "location",
            )
        ),
        /* TODO: photo FieldConfiguration(
             mimeType = ContactsContract.CommonDataKinds.PHOTO.CONTENT_ITEM_TYPE,
             outputKey = "url",
             primaryValueColumn = "data1"
         ),*/
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Website.CONTENT_ITEM_TYPE,
            outputKey = "url",
            primaryValueColumn = ContactsContract.CommonDataKinds.Website.URL,
            typeColumn = ContactsContract.CommonDataKinds.Website.TYPE,
            typeMapping = mapOf(
                ContactsContract.CommonDataKinds.Website.TYPE_WORK to "work",
                ContactsContract.CommonDataKinds.Website.TYPE_OTHER to "other",
                ContactsContract.CommonDataKinds.Website.TYPE_CUSTOM to "custom",
                ContactsContract.CommonDataKinds.Website.TYPE_BLOG to "blog",
                ContactsContract.CommonDataKinds.Website.TYPE_FTP to "ftp",
                ContactsContract.CommonDataKinds.Website.TYPE_HOME to "home",
                ContactsContract.CommonDataKinds.Website.TYPE_HOMEPAGE to "homePage",
            ),
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Note.CONTENT_ITEM_TYPE,
            outputKey = "biography",
            primaryValueColumn = ContactsContract.CommonDataKinds.Note.NOTE
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Event.CONTENT_ITEM_TYPE,
            outputKey = "event",
            primaryValueColumn = ContactsContract.CommonDataKinds.Event.START_DATE,
            typeColumn = ContactsContract.CommonDataKinds.Event.TYPE,
            typeMapping = mapOf(
                ContactsContract.CommonDataKinds.Event.TYPE_BIRTHDAY to "birthday",
                ContactsContract.CommonDataKinds.Event.TYPE_OTHER to "other",
                ContactsContract.CommonDataKinds.Event.TYPE_CUSTOM to "custom",
                ContactsContract.CommonDataKinds.Event.TYPE_ANNIVERSARY to "anniversary",
            ),
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Nickname.CONTENT_ITEM_TYPE,
            outputKey = "nickname",
            primaryValueColumn = ContactsContract.CommonDataKinds.Nickname.NAME,
            typeColumn = ContactsContract.CommonDataKinds.Nickname.TYPE,
            typeMapping = mapOf(
                ContactsContract.CommonDataKinds.Nickname.TYPE_DEFAULT to "default",
                ContactsContract.CommonDataKinds.Nickname.TYPE_INITIALS to "initials",
                ContactsContract.CommonDataKinds.Nickname.TYPE_OTHER_NAME to "otherName",
                ContactsContract.CommonDataKinds.Nickname.TYPE_SHORT_NAME to "shortName",
                ContactsContract.CommonDataKinds.Nickname.TYPE_MAIDEN_NAME to "maidenName",
            ),
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Relation.CONTENT_ITEM_TYPE,
            outputKey = "relation",
            primaryValueColumn = ContactsContract.CommonDataKinds.Relation.NAME,
            typeColumn = ContactsContract.CommonDataKinds.Relation.TYPE,
            typeMapping = mapOf(
                ContactsContract.CommonDataKinds.Relation.TYPE_ASSISTANT to "assistant",
                ContactsContract.CommonDataKinds.Relation.TYPE_BROTHER to "brother",
                ContactsContract.CommonDataKinds.Relation.TYPE_CHILD to "child",
                ContactsContract.CommonDataKinds.Relation.TYPE_DOMESTIC_PARTNER to "domesticPartner",
                ContactsContract.CommonDataKinds.Relation.TYPE_FATHER to "father",
                ContactsContract.CommonDataKinds.Relation.TYPE_FRIEND to "friend",
                ContactsContract.CommonDataKinds.Relation.TYPE_MANAGER to "manager",
                ContactsContract.CommonDataKinds.Relation.TYPE_MOTHER to "mother",
                ContactsContract.CommonDataKinds.Relation.TYPE_PARENT to "parent",
                ContactsContract.CommonDataKinds.Relation.TYPE_PARTNER to "partner",
                ContactsContract.CommonDataKinds.Relation.TYPE_REFERRED_BY to "referredBy",
                ContactsContract.CommonDataKinds.Relation.TYPE_RELATIVE to "relative",
                ContactsContract.CommonDataKinds.Relation.TYPE_SISTER to "sister",
                ContactsContract.CommonDataKinds.Relation.TYPE_SPOUSE to "spouse",
            ),
        ),
        /*TODO: it's deprecated FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Im.CONTENT_ITEM_TYPE,
            outputKey = "account",
            primaryValueColumn = "data1",
            customProcessor = { imData ->
                val imAddress = imData["data1"] as? String
                val protocol = when (imData["data5"] as? Long) {
                    0L -> "custom"
                    1L -> "aim"
                    2L -> "msn"
                    3L -> "yahoo"
                    4L -> "skype"
                    5L -> "qq"
                    6L -> "google_talk"
                    7L -> "icq"
                    8L -> "jabber"
                    else -> "unknown"
                }
                if (!imAddress.isNullOrEmpty()) {
                    mapOf(
                        "value" to imAddress,
                        "protocol" to protocol,
                        "source" to "Android Phone"
                    )
                } else null
            }
        )*/
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.GroupMembership.CONTENT_ITEM_TYPE,
            outputKey = "contactImportGroup",
            primaryValueColumn = ContactsContract.CommonDataKinds.GroupMembership.GROUP_ROW_ID,
        ),
        FieldConfiguration(
            mimeType = ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE,
            outputKey = "headline",
            primaryValueColumn = ContactsContract.CommonDataKinds.Organization.TITLE,
            customProcessor = { orgData ->
                val position = orgData[ContactsContract.CommonDataKinds.Organization.TITLE] as? String
                val org = orgData[ContactsContract.CommonDataKinds.Organization.COMPANY] as? String

                // Only create headline if we have both position and organization
                if (!position.isNullOrEmpty() && !org.isNullOrEmpty()) {
                    mapOf(
                        "value" to "$position at $org",
                        "source" to "Android Phone"
                    )
                } else null
            }
        ),
    )

    private fun normalizePhoneNumber(phoneNumber: String?): String {
        if (phoneNumber.isNullOrEmpty()) return ""
        val digitsOnly = phoneNumber.replace(Regex("[^+\\d]"), "")
        return digitsOnly
    }

    private fun getTypeString(
        typeInt: Int,
        customTypeLabel: String?,
        typeMapping: Map<Int, String>
    ): String {
        return when (typeInt) {
            ContactsContract.CommonDataKinds.Phone.TYPE_CUSTOM -> {
                if (!customTypeLabel.isNullOrEmpty()) {
                    customTypeLabel
                } else {
                    "other"
                }
            }

            else -> typeMapping[typeInt] ?: "other"
        }
    }

    private fun processFieldData(
        contactId: Long,
        config: FieldConfiguration
    ): List<Map<String, Any>>? {
        val rawData =
            getContactDataByMimeType(contactId, config.mimeType, config.outputKey.uppercase())
        if (rawData.isEmpty()) return null

        val processedItems = mutableListOf<Map<String, Any>>()

        rawData.forEach { itemData ->
            val processedItem = if (config.customProcessor != null) {
                config.customProcessor.invoke(itemData)
            } else {
                buildStructuredItemMap(itemData, config.primaryValueColumn, config.optionalFields)
            }

            processedItem?.let { item ->
                val mutableItem = item.toMutableMap()

                if (config.typeColumn != null && config.typeMapping != null) {
                    val data2Value = itemData[config.typeColumn]
                    val typeInt = when (data2Value) {
                        is Int -> data2Value
                        is String -> data2Value.toIntOrNull()
                        else -> null
                }
                    val customLabel = if (config.customTypeColumn != null) {
                        itemData[config.customTypeColumn] as? String
                    } else null
                    Log.d("ContactImporter", "Type: $typeInt   ")

                    if (typeInt != null) {
                        mutableItem["type"] =
                            getTypeString(typeInt, customLabel, config.typeMapping)
            }
        }

                processedItems.add(mutableItem)
                }
        }

        // Deduplicate field entries with smart logic based on field type
        val uniqueItems = when (config.outputKey) {
            "phoneNumber" -> {
                // Smart phone number deduplication - normalize before comparing
                processedItems.distinctBy { item ->
                    val phoneValue = item["value"] as? String
                    normalizePhoneNumber(phoneValue)
                }
            }
            "email" -> {
                // Email deduplication - case insensitive
                processedItems.distinctBy { item ->
                    val emailValue = item["value"] as? String
                    emailValue?.lowercase()?.trim()
                }
            }
            else -> {
                // Default: simple value-based deduplication
                processedItems.distinctBy { it["value"] as? String }
            }
        }

        Log.d("ContactImporter", "${config.outputKey}: Filtered ${processedItems.size} items down to ${uniqueItems.size} unique items")

        return if (uniqueItems.isNotEmpty()) uniqueItems else null
    }


    private fun transformToNaoContact(contactId: Long): Contact? {
        try {
            val currentDateTime = java.util.Date().toString()
            val contactFields = mutableMapOf<String, List<Map<String, Any>>>()

            fieldConfigurations.forEach { config ->
                processFieldData(contactId, config)?.let { processedItems ->
                    contactFields[config.outputKey] = processedItems
                }
            }

            val timestampData = mapOf(
                "valueDateTime" to currentDateTime,
                "source" to "system"
            )

            return Contact(
                name = contactFields["name"],
                phoneNumber = contactFields["phoneNumber"],
                email = contactFields["email"],
                address = contactFields["address"],
                organization = contactFields["organization"],
                url = contactFields["url"],
                biography = contactFields["biography"],
                event = contactFields["event"],
                nickname = contactFields["nickname"],
                relation = contactFields["relation"],
                contactImportGroup = contactFields["contactImportGroup"],
                headline = contactFields["headline"],
                createdAt = timestampData,
                updatedAt = timestampData
            )

        } catch (e: Exception) {
            Log.e("ContactImporter", "Error transforming contact $contactId", e)
            return null
        }
    }

    private fun getContactIds(): List<Long> {
        val contactIds = mutableSetOf<Long>()
        val cursor = activity.contentResolver.query(
            ContactsContract.Contacts.CONTENT_URI,
            arrayOf(ContactsContract.Contacts._ID),
            null,
            null,
            ContactsContract.Contacts.DISPLAY_NAME + " ASC"
        )

        cursor?.use {
            val idIndex = it.getColumnIndex(ContactsContract.Contacts._ID)
            while (it.moveToNext()) {
                val id = it.getLong(idIndex)
                contactIds.add(id)
            }
        }
        return contactIds.toList()
    }

    private fun getContactDataByMimeType(
        contactId: Long,
        mimeType: String,
        logPrefix: String
    ): List<Map<String, Any?>> {
        val dataList = mutableListOf<Map<String, Any?>>()
        val cursor = activity.contentResolver.query(
            ContactsContract.Data.CONTENT_URI,
            null,
            """
            ${ContactsContract.Data.CONTACT_ID}=?
            AND ${ContactsContract.Data.MIMETYPE}=?
        """.trimIndent(),
            arrayOf(contactId.toString(), mimeType),
            null
        )
        cursor?.use {
            Log.d("ContactImporter", "--- $logPrefix DATA COLUMNS ---")
            while (it.moveToNext()) {
                val dataMap = mutableMapOf<String, Any?>()
                for (i in 0 until it.columnCount) {
                    val columnName = it.getColumnName(i)
                    val columnValue = when (it.getType(i)) {
                        Cursor.FIELD_TYPE_STRING -> it.getString(i)
                        Cursor.FIELD_TYPE_INTEGER -> it.getInt(i)
                        Cursor.FIELD_TYPE_FLOAT -> it.getDouble(i)
                        Cursor.FIELD_TYPE_BLOB -> "[BLOB-${it.getBlob(i)?.size ?: 0} bytes]"
                        Cursor.FIELD_TYPE_NULL -> null
                        else -> it.getString(i)
                    }
                    dataMap[columnName] = columnValue
                    Log.d("ContactImporter", "$logPrefix $columnName: $columnValue")
                }
                dataList.add(dataMap)
            }
        }
        return dataList
    }


    private fun mapToJSObject(map: Map<String, Any?>): JSObject {
        val jsObject = JSObject()
        map.forEach { (key, value) ->
            when (value) {
                null -> jsObject.put(key, JSONObject.NULL)
                is String -> jsObject.put(key, value)
                is Number -> jsObject.put(key, value)
                is Boolean -> jsObject.put(key, value)
                is List<*> -> {
                    val jsArray = JSArray()
                    value.forEach { item ->
                        when (item) {
                            is Map<*, *> -> jsArray.put(mapToJSObject(item as Map<String, Any?>))
                            else -> jsArray.put(item)
                        }
                    }
                    jsObject.put(key, jsArray)
                }

                is Map<*, *> -> jsObject.put(key, mapToJSObject(value as Map<String, Any?>))
                else -> jsObject.put(key, value.toString())
            }
        }
        return jsObject
    }
}
