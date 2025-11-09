import OpenAI from 'openai';

export type Tool = OpenAI.Chat.ChatCompletionTool;

// group_chat
// dm's with another
// get posts on a timeline


export const tools: Tool[] = [
	{
		type: 'function',
		function: {
			name: 'get_contact_by_nuri',
			description: 'Get the contact information by its NURI (Nextgraph Resource Identifier)',
			parameters: {
				type: 'object',
				properties: {
					nuri: { type: 'string' }
				}
			}
		}
	},
	// {
	// 	type: 'function',
	// 	function: {
	// 		name: 'get_nuri_contents',
	// 		description: 'Get the contents of a NURI (Nextgraph Resource Identifier) for a contact, group, etc. by its ID',
	// 		parameters: {
	// 			type: 'object',
	// 			properties: {
	// 				nuri: { type: 'string' }
	// 			}
	// 		}
	// 	}
	// },
	// {
	// 	type: 'function',
	// 	function: {
	// 		name: 'find_group_members_by_id',
	// 		description: 'Get contact information of members of a group, searched by group ID',
	// 		parameters: {
	// 			type: 'object',
	// 			properties: {
	// 				id: { type: 'string' }
	// 			}
	// 		}
	// 	}
	// },
	// {
	// 	type: 'function',
	// 	function: {
	// 		name: 'find_group_members_by_name',
	// 		description: 'Get contact information of members of a group, searched by group name',
	// 		parameters: {
	// 			type: 'object',
	// 			properties: {
	// 				name: { type: 'string' }
	// 			}
	// 		}
	// 	}
	// },
	{
		type: 'function',
		function: {
			name: 'search_contacts',
			description: 'Search contacts by a keyword within property values',
			parameters: {
				type: 'object',
				properties: {
					value: { type: 'string', description: 'Value to search for within all property values (name, email, address, nickname etc)' },
				}
			}
		}
	},
	// {
	// 	type: 'function',
	// 	function: {
	// 		name: 'search_contacts_by_property',
	// 		description: 'Search contacts by a property within the value (e.g., email, phone, address or nested properties email.source, account.value, address.city)',
	// 		parameters: {
	// 			type: 'object',
	// 			properties: {
	// 				property: { type: 'string', description: 'Property to search within the value (e.g., searched parts of email, phone, address or email.source, account.value, address.city). Use a certainly contained part of the value.' },
	// 				value: { type: 'string', description: 'Value to search for within the specified property' },
	// 				operation: { type: 'string', description: 'Operation to perform on the value (e.g., contains, equals, greater_than, less_than)', default: 'contains' }
	// 			}
	// 		}
	// 	}
	// },
	// {
	// 	type: 'function',
	// 	function: {
	// 		name: 'search_groups_by_property',
	// 		description: 'Search groups by a property (e.g., name, description, memberCount)',
	// 		parameters: {
	// 			type: 'object',
	// 			properties: {
	// 				property: { type: 'string', description: 'Property to search by (e.g., name, description, memberCount)' },
	// 				value: { type: 'string', description: 'Value to search for within the specified property' },
	// 				operation: { type: 'string', description: 'Operation to perform on the value (e.g., contains, equals, greater_than, less_than)', default: 'contains' }
	// 			}
	// 		}
	// 	}
	// }
]