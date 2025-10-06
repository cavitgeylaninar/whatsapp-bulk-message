const SessionManager = require('./SessionManager');
const logger = require('../../../utils/logger');
const WhatsAppWebContact = require('../models/WhatsAppWebContact');

class ContactManager {
  constructor() {
    this.contactsCache = new Map();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for contact changes
   */
  setupEventListeners() {
    SessionManager.on('contact_changed', async ({ sessionId, message, oldId, newId, isContact }) => {
      await this.handleContactChange(sessionId, oldId, newId, isContact);
    });

    SessionManager.on('ready', async ({ sessionId, info, userId }) => {
      logger.info(`Session ${sessionId} ready with userId: ${userId}`);
      // AUTO-SYNC DISABLED: WhatsApp Web contacts should NOT be saved to WhatsAppContact table
      // The WhatsAppContact table is only for Business API contacts
      // WhatsApp Web has its own contact management system that doesn't persist to database
    });
  }

  /**
   * Get all contacts with pagination support
   * @param {string} sessionId
   * @param {object} options - { page: 1, limit: 50, search: '', savedOnly: false }
   */
  async getContacts(sessionId, options = {}) {
    try {
      // Extract pagination parameters
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 50;
      const offset = (page - 1) * limit;
      const search = options.search || '';
      const savedOnly = options.savedOnly === 'true' || options.savedOnly === true;
      const whatsappOnly = options.whatsappOnly === 'true' || options.whatsappOnly === true;

      logger.info(`Getting contacts for session ${sessionId} with options:`, {
        page, limit, offset, search, savedOnly, whatsappOnly
      });

      const client = SessionManager.getClient(sessionId);
      if (!client) {
        logger.error(`Session ${sessionId} not found or not ready`);
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      // Check client state first
      let state = 'unknown';
      try {
        state = await client.getState();
        logger.info(`Client state for session ${sessionId}: ${state}`);
      } catch (stateError) {
        logger.warn('Could not get client state:', stateError.message);
      }

      // Check if session is ready for contact operations
      const isReady = SessionManager.isSessionReady(sessionId);
      logger.info(`Session ${sessionId} ready status: ${isReady}`);

      if (!isReady) {
        logger.warn(`Session ${sessionId} is not ready, state: ${state}`);
        return {
          total: 0,
          contacts: [],
          error: 'WhatsApp oturumu hazır değil. Lütfen QR kodu tarayın ve tekrar deneyin.'
        };
      }

      // Get only saved contacts and chats to avoid duplicates
      let contacts = [];
      const contactMap = new Map();
      const phoneNumberMap = new Map(); // Track by phone number to avoid duplicates

      try {
        // OPTIMIZED: Only get contacts, skip chats for faster loading
        // getChats() is slow and causes timeouts with large contact lists
        logger.info('Optimized mode: Fetching contacts directly without chats...');

        try {
          // Add longer timeout for getContacts since we're only doing this one call
          const contactsPromise = client.getContacts();
          const contactsTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('getContacts timeout after 25 seconds')), 25000)
          );

          const savedContacts = await Promise.race([contactsPromise, contactsTimeoutPromise]);
          logger.info(`Retrieved ${savedContacts.length} contacts from WhatsApp`);

          // Filter contacts based on options
          for (const contact of savedContacts) {
            // Skip groups and invalid contacts
            if (contact.id && !contact.isGroup) {
              // Removed filtering - show all contacts
              // if (savedOnly && !contact.isMyContact) {
              //   continue;
              // }
              // if (whatsappOnly && !contact.isWAContact) {
              //   continue;
              // }

              // Extract clean phone number
              const phoneNumber = contact.id.user || contact.number;
              const cleanNumber = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';

              // Only add contacts with valid phone numbers (at least 10 digits)
              // and we haven't seen this phone number before
              if (cleanNumber && cleanNumber.length >= 10 && !phoneNumberMap.has(cleanNumber)) {
                // Mark if it's a WhatsApp user (has WhatsApp account)
                contact.isUser = contact.isUser !== false && contact.isWAContact !== false;
                contactMap.set(contact.id._serialized, contact);
                phoneNumberMap.set(cleanNumber, true);
              }
            }
          }

          contacts = Array.from(contactMap.values());
          logger.info(`Retrieved ${contacts.length} unique contacts (optimized mode)`);
        } catch (error) {
          // If even the optimized approach times out, return partial results from cache
          if (this.contactsCache.has(sessionId)) {
            logger.warn('getContacts timed out, returning cached contacts');
            contacts = this.contactsCache.get(sessionId);
            return {
              total: contacts.length,
              contacts: contacts,
              fromCache: true,
              message: 'Kişiler önbellekten yüklendi'
            };
          }
          throw error;
        }
      } catch (error) {
        logger.error('Failed to fetch contacts from WhatsApp:', error);
        logger.error('Error details:', {
          message: error.message,
          stack: error.stack,
          sessionId: sessionId,
          clientState: state
        });
        return {
          total: 0,
          contacts: [],
          error: 'Kişiler yüklenemedi. Lütfen WhatsApp Web bağlantınızı kontrol edin.'
        };
      }

      // Filter options
      let filteredContacts = contacts;

      // Remove restrictive filtering - include all contacts from WhatsApp
      // According to WhatsApp Web.js docs, getContacts() returns all contacts
      // We should not filter them unnecessarily

      // Filter by saved contacts only
      if (options.savedOnly) {
        filteredContacts = filteredContacts.filter(c => c.isMyContact);
      }

      // Search by name or number
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredContacts = filteredContacts.filter(c =>
          (c.name && c.name.toLowerCase().includes(searchLower)) ||
          (c.pushname && c.pushname.toLowerCase().includes(searchLower)) ||
          (c.number && c.number.includes(options.search))
        );
      }

      // Map to simplified format - process synchronously to avoid hanging
      const mappedContacts = [];
      const processedNumbers = new Set(); // Track processed numbers to avoid duplicates
      const processedNames = new Map(); // Track names to handle duplicates

      // Process only what we need for pagination
      const startIdx = 0; // Process all for search/filter, then paginate
      const endIdx = filteredContacts.length;

      for (let i = startIdx; i < endIdx && i < filteredContacts.length; i++) {
            const contact = filteredContacts[i];
            try {
              // Skip fetching profile pic for now to speed up loading
              // let profilePicUrl = null;
              // try {
              //   profilePicUrl = await contact.getProfilePicUrl();
              // } catch (error) {
              //   // Profile pic might not be available
              // }

              // Skip async isBlocked check for performance - set to false by default
              let isBlocked = false;
              // Only check if it's already a boolean property
              if (typeof contact.isBlocked === 'boolean') {
                isBlocked = contact.isBlocked;
              }

              // Get the actual phone number and clean it
              const rawPhoneNumber = contact.id?.user || contact.number || '';
              const phoneNumber = rawPhoneNumber.replace(/[^0-9]/g, '');

              // Log contacts with strange IDs for debugging
              if (contact.name === 'Annem' || (phoneNumber && !phoneNumber.startsWith('90'))) {
                logger.debug(`[ContactManager] Contact debug - Name: ${contact.name}, ID: ${contact.id?._serialized}, User: ${contact.id?.user}, Number: ${contact.number}, Processed: ${phoneNumber}`);
              }

              // Skip invalid or duplicate numbers
              if (!phoneNumber || phoneNumber.length < 10) {
                continue; // Use continue instead of return in a loop
              }

              // Skip if we've already processed this number
              if (processedNumbers.has(phoneNumber)) {
                continue;
              }

              // Get the best available name
              let displayName = '';
              if (contact.name && contact.name.trim()) {
                displayName = contact.name;
              } else if (contact.pushname && contact.pushname.trim()) {
                displayName = contact.pushname;
              } else if (contact.verifiedName && contact.verifiedName.trim()) {
                displayName = contact.verifiedName;
              } else {
                // If no name is available, format the phone number nicely
                displayName = phoneNumber ? `+${phoneNumber}` : 'Unknown';
              }

              // Handle duplicate names - prefer Turkish numbers
              if (displayName && displayName !== 'Unknown') {
                const existingContact = processedNames.get(displayName);
                if (existingContact) {
                  const existingIsTurkish = existingContact.number.startsWith('90');
                  const currentIsTurkish = phoneNumber.startsWith('90');

                  // If existing is not Turkish but current is Turkish, replace
                  if (!existingIsTurkish && currentIsTurkish) {
                    // Remove the old contact
                    const oldIndex = mappedContacts.findIndex(c => c.number === existingContact.number);
                    if (oldIndex !== -1) {
                      mappedContacts.splice(oldIndex, 1);
                      processedNumbers.delete(existingContact.number);
                    }
                  } else {
                    // Skip this duplicate
                    continue;
                  }
                }
              }

              // Use phone number based ID for consistency
              const contactId = phoneNumber.startsWith('90') ? `${phoneNumber}@c.us` : contact.id._serialized || contact.id;

              const mappedContact = {
                id: contactId,
                number: phoneNumber,
                name: displayName,
                pushname: contact.pushname || '',
                isMyContact: contact.isMyContact || false,
                isUser: contact.isUser !== false,
                isGroup: contact.isGroup || false,
                isEnterprise: contact.isEnterprise || false,
                isBlocked: isBlocked,
                profilePicUrl: null,
                status: contact.status || '',
                hasName: !!(contact.name || contact.pushname || contact.verifiedName)
              };

              // Add to mapped contacts and track
              mappedContacts.push(mappedContact);
              processedNumbers.add(phoneNumber);
              if (displayName && displayName !== 'Unknown') {
                processedNames.set(displayName, mappedContact);
              }
            } catch (error) {
              logger.warn(`Error processing contact: ${error.message}`);
            }
      }

      // Cache contacts
      this.contactsCache.set(sessionId, mappedContacts);

      // Sort contacts: saved contacts with names first, then others
      mappedContacts.sort((a, b) => {
        // Prioritize contacts with actual names
        if (a.hasName && !b.hasName) return -1;
        if (!a.hasName && b.hasName) return 1;

        // Then prioritize saved contacts
        if (a.isMyContact && !b.isMyContact) return -1;
        if (!a.isMyContact && b.isMyContact) return 1;

        // Finally sort alphabetically by name
        return a.name.localeCompare(b.name);
      });

      // Log summary for debugging
      const savedCount = mappedContacts.filter(c => c.isMyContact).length;
      const namedCount = mappedContacts.filter(c => c.hasName).length;
      logger.info(`Contact summary - Total: ${mappedContacts.length}, Saved: ${savedCount}, With names: ${namedCount}`);

      // Apply pagination AFTER sorting
      const paginatedContacts = mappedContacts.slice(offset, offset + limit);

      const result = {
        total: mappedContacts.length,
        contacts: paginatedContacts,
        page: page,
        limit: limit,
        totalPages: Math.ceil(mappedContacts.length / limit),
        hasMore: (offset + limit) < mappedContacts.length
      };

      logger.info(`[ContactManager] Returning page ${page} with ${paginatedContacts.length} of ${result.total} total contacts`);
      return result;
    } catch (error) {
      logger.error(`Error fetching contacts from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get single contact by phone number
   * @param {string} sessionId
   * @param {string} phoneNumber
   */
  async getContact(sessionId, phoneNumber) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const contactId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      const contact = await client.getContactById(contactId);

      if (!contact) {
        throw new Error('Contact not found');
      }

      let profilePicUrl = null;
      try {
        profilePicUrl = await contact.getProfilePicUrl();
      } catch (error) {
        // Profile pic might not be available
      }

      const about = await contact.getAbout();
      const chat = await contact.getChat();

      return {
        id: contact.id._serialized,
        number: contact.number,
        name: contact.name || contact.pushname,
        pushname: contact.pushname,
        isMyContact: contact.isMyContact,
        isUser: contact.isUser,
        isGroup: contact.isGroup,
        isEnterprise: contact.isEnterprise,
        isBlocked: await contact.isBlocked,
        profilePicUrl,
        about,
        lastSeen: chat ? chat.lastMessage?.timestamp : null
      };
    } catch (error) {
      logger.error(`Error fetching contact ${phoneNumber} from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Check if phone numbers have WhatsApp
   * @param {string} sessionId
   * @param {array} phoneNumbers
   */
  async checkWhatsAppNumbers(sessionId, phoneNumbers) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const results = [];

      for (const number of phoneNumbers) {
        try {
          const contactId = number.includes('@') ? number : `${number}@c.us`;
          const contact = await client.getContactById(contactId);

          results.push({
            number,
            hasWhatsApp: contact.isUser,
            isMyContact: contact.isMyContact,
            name: contact.name || contact.pushname
          });
        } catch (error) {
          results.push({
            number,
            hasWhatsApp: false,
            error: error.message
          });
        }
      }

      return {
        total: phoneNumbers.length,
        withWhatsApp: results.filter(r => r.hasWhatsApp).length,
        withoutWhatsApp: results.filter(r => !r.hasWhatsApp).length,
        results
      };
    } catch (error) {
      logger.error(`Error checking WhatsApp numbers from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get all chats
   * @param {string} sessionId
   * @param {object} options
   */
  async getChats(sessionId, options = {}) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      // Add limit option with default value
      const limit = options.limit || 50; // Default to 50 chats
      const offset = options.offset || 0;

      logger.info(`Getting chats with limit: ${limit}, offset: ${offset}`);

      const chats = await client.getChats();

      // Filter options
      let filteredChats = chats;

      // Filter by unread only
      if (options.unreadOnly) {
        filteredChats = filteredChats.filter(c => c.unreadCount > 0);
      }

      // Filter by groups only
      if (options.groupsOnly) {
        filteredChats = filteredChats.filter(c => c.isGroup);
      }

      // Filter by individuals only
      if (options.individualsOnly) {
        filteredChats = filteredChats.filter(c => !c.isGroup);
      }

      // Map to simplified format
      const mappedChats = await Promise.all(
        filteredChats.map(async (chat) => {
          const contact = await chat.getContact();
          let profilePicUrl = null;

          try {
            profilePicUrl = await contact.getProfilePicUrl();
          } catch (error) {
            // Profile pic might not be available
          }

          return {
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount,
            lastMessage: chat.lastMessage ? {
              body: chat.lastMessage.body,
              timestamp: chat.lastMessage.timestamp,
              fromMe: chat.lastMessage.fromMe
            } : null,
            timestamp: chat.timestamp,
            archived: chat.archived,
            pinned: chat.pinned,
            isMuted: chat.isMuted,
            muteExpiration: chat.muteExpiration,
            profilePicUrl,
            contact: {
              number: contact.number,
              name: contact.name || contact.pushname
            }
          };
        })
      );

      // Sort by timestamp (most recent first)
      mappedChats.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const paginatedChats = mappedChats.slice(offset, offset + limit);

      logger.info(`Returning ${paginatedChats.length} chats out of ${mappedChats.length} total`);

      return {
        total: mappedChats.length,
        unread: mappedChats.filter(c => c.unreadCount > 0).length,
        chats: paginatedChats,
        hasMore: (offset + limit) < mappedChats.length,
        limit,
        offset
      };
    } catch (error) {
      logger.error(`Error fetching chats from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Block/Unblock contact
   * @param {string} sessionId
   * @param {string} phoneNumber
   * @param {boolean} block
   */
  async blockContact(sessionId, phoneNumber, block = true) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const contactId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      const contact = await client.getContactById(contactId);

      if (!contact) {
        throw new Error('Contact not found');
      }

      if (block) {
        await contact.block();
        logger.info(`Contact ${phoneNumber} blocked in session ${sessionId}`);
      } else {
        await contact.unblock();
        logger.info(`Contact ${phoneNumber} unblocked in session ${sessionId}`);
      }

      return {
        success: true,
        phoneNumber,
        blocked: block
      };
    } catch (error) {
      logger.error(`Error blocking/unblocking contact in session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get contact status/about
   * @param {string} sessionId
   * @param {string} contactId
   */
  async getContactStatus(sessionId, contactId) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        return null;
      }

      const contact = await client.getContactById(contactId);
      if (!contact) {
        return null;
      }

      return await contact.getAbout();
    } catch (error) {
      logger.warn(`Could not get status for contact ${contactId}`);
      return null;
    }
  }

  /**
   * Sync contacts to database
   * WhatsApp Web contacts are saved to database for persistence
   * @param {string} sessionId
   * @param {string} userId
   */
  async syncContacts(sessionId, userId) {
    try {
      logger.info(`Starting contact sync for session ${sessionId}`);

      // Verify session is ready
      const client = SessionManager.getClient(sessionId);
      const isReady = SessionManager.isSessionReady(sessionId);

      logger.info(`Session check - client exists: ${!!client}, isReady: ${isReady}`);

      if (!client || !isReady) {
        logger.warn(`Session ${sessionId} not ready for sync`);
        return {
          success: false,
          synced: 0,
          message: 'WhatsApp bağlantısı hazır değil. Lütfen önce bağlanın.'
        };
      }

      // Get WhatsApp account owner's name to create meaningful session ID
      let actualSessionId = sessionId;
      const sessionInfo = SessionManager.getSession(sessionId);
      if (sessionInfo && sessionInfo.info && sessionInfo.info.pushname) {
        // Create session ID based on WhatsApp account owner's name
        const accountName = sessionInfo.info.pushname
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')  // Replace special chars with dash
          .replace(/-+/g, '-')          // Replace multiple dashes with single dash
          .replace(/^-|-$/g, '');       // Remove leading/trailing dashes
        actualSessionId = `session-${accountName}`;
        logger.info(`Using WhatsApp account based session ID: ${actualSessionId} (Owner: ${sessionInfo.info.pushname})`);
      }

      // First check if we have cached contacts
      if (this.contactsCache.has(sessionId)) {
        logger.info('Using cached contacts for immediate sync');
        const cachedContacts = this.contactsCache.get(sessionId);

        // Save cached contacts immediately
        let savedCount = 0;
        let updatedCount = 0;

        // Get existing WhatsApp Web contacts first
        const existingContacts = await WhatsAppWebContact.findAll({
          where: {
            user_id: userId,
            session_id: actualSessionId
          },
          attributes: ['phone']
        });
        const savedPhones = new Set(existingContacts.map(c => c.phone));
        logger.info(`Found ${savedPhones.size} existing contacts in database (cache sync)`);

        for (const contact of cachedContacts) {
          try {
            if (contact.id && contact.id.includes('@lid')) continue;
            const phoneNumber = contact.number || contact.id?.replace('@c.us', '').replace('@s.whatsapp.net', '');
            if (!phoneNumber || phoneNumber.length > 13) continue;
            if (savedPhones.has(phoneNumber)) continue;

            // Skip non-Turkish numbers (optional - comment out if you want all numbers)
            // if (!phoneNumber.startsWith('90')) continue;

            if (phoneNumber) {
              const whatsappId = contact.id || `${phoneNumber}@c.us`;
              const [contactRecord, created] = await WhatsAppWebContact.findOrCreate({
                where: {
                  whatsapp_id: whatsappId
                },
                defaults: {
                  session_id: actualSessionId,
                  user_id: userId,
                  whatsapp_id: whatsappId,
                  name: contact.name || phoneNumber,
                  phone: phoneNumber,
                  is_business: contact.isBusiness || false,
                  is_active: true,
                  metadata: {
                    original_contact: contact
                  }
                }
              });

              // Update name if contact already exists and name changed
              if (!created && contact.name && contactRecord.name !== contact.name) {
                await contactRecord.update({ name: contact.name });
              }

              savedPhones.add(phoneNumber);

              if (created) {
                savedCount++;
              } else {
                updatedCount++;
              }
            }
          } catch (error) {
            logger.warn(`Failed to save cached contact:`, error.message);
          }
        }

        // Return immediately with cached result
        if (savedCount > 0 || updatedCount > 0) {
          logger.info(`Quick sync completed - New: ${savedCount}, Updated: ${updatedCount}, Total: ${cachedContacts.length}`);

          // Start background refresh
          this.getContacts(sessionId, { whatsappOnly: true }).then(result => {
            logger.info('Background contact refresh completed');
            // Contacts will be cached for next sync
          }).catch(err => {
            logger.warn('Background contact refresh failed:', err.message);
          });

          return {
            success: true,
            synced: savedCount,
            updated: updatedCount,
            total: cachedContacts.length,
            message: `${savedCount} yeni kişi eklendi, ${updatedCount} kişi güncellendi (önbellek)`
          };
        }
      }

      // If no cache, fetch contacts normally (without quick timeout)
      let contacts = [];
      try {
        logger.info('No cache found, fetching contacts from WhatsApp...');

        // Get contacts with the normal timeout (10 seconds for WhatsApp API)
        const result = await this.getContacts(sessionId, {
          whatsappOnly: true,
          savedOnly: false
        });

        logger.info(`getContacts returned: total=${result.total}, contacts=${result.contacts?.length || 0}`);
        contacts = result.contacts || [];
      } catch (error) {
        logger.warn('Failed to get contacts for sync');
        logger.error('getContacts error details:', error.message);

        return {
          success: false,
          synced: 0,
          message: 'Kişiler yüklenemedi. Lütfen WhatsApp bağlantınızı kontrol edin.'
        };
      }

      // Save contacts to database
      let savedCount = 0;
      let updatedCount = 0;

      // First, get existing WhatsApp Web contacts to prevent duplicates
      const existingContacts = await WhatsAppWebContact.findAll({
        where: {
          user_id: userId,
          session_id: actualSessionId
        },
        attributes: ['phone']
      });
      const savedPhones = new Set(existingContacts.map(c => c.phone));
      logger.info(`Found ${savedPhones.size} existing contacts in database`);

      for (const contact of contacts) {
        try {
          // Skip LinkedIn/business contacts (@lid format)
          if (contact.id && contact.id.includes('@lid')) {
            logger.debug(`Skipping LinkedIn contact: ${contact.name} (${contact.id})`);
            continue;
          }

          // Extract phone number from contact ID or use the number field
          const phoneNumber = contact.number || contact.id?.replace('@c.us', '').replace('@s.whatsapp.net', '');

          // Skip if this is not a valid phone number (e.g., LinkedIn IDs are 14-15 digits)
          // Regular phone numbers are typically 10-13 digits
          if (!phoneNumber || phoneNumber.length > 13) {
            logger.debug(`Skipping invalid/long number: ${contact.name} (${phoneNumber})`);
            continue;
          }

          // Skip non-Turkish numbers (optional - comment out if you want all numbers)
          // if (!phoneNumber.startsWith('90')) {
          //   logger.debug(`Skipping non-Turkish number: ${contact.name} (${phoneNumber})`);
          //   continue;
          // }

          // Skip if we already saved this phone number (prevent duplicates)
          if (savedPhones.has(phoneNumber)) {
            logger.debug(`Skipping duplicate: ${contact.name} (${phoneNumber})`);
            continue;
          }

          if (phoneNumber) {
            // Use findOrCreate to prevent duplicates
            const whatsappId = contact.id || `${phoneNumber}@c.us`;
            const [contactRecord, created] = await WhatsAppWebContact.findOrCreate({
              where: {
                whatsapp_id: whatsappId
              },
              defaults: {
                session_id: actualSessionId,
                user_id: userId,
                whatsapp_id: whatsappId,
                name: contact.name || phoneNumber,
                phone: phoneNumber,
                is_business: contact.isBusiness || false,
                is_active: true,
                metadata: {
                  original_contact: contact
                }
              }
            });

            // Update name if contact already exists and name changed
            if (!created && contact.name && contactRecord.name !== contact.name) {
              await contactRecord.update({ name: contact.name });
              logger.debug(`Updated existing contact: ${contact.name} (${phoneNumber})`);
            }

            // Track saved phone number
            savedPhones.add(phoneNumber);

            if (created) {
              savedCount++;
              logger.debug(`Created new contact: ${contact.name || phoneNumber} (${phoneNumber})`);
            } else {
              updatedCount++;
              logger.debug(`Contact already exists: ${contact.name || phoneNumber} (${phoneNumber})`);
            }
          }
        } catch (error) {
          logger.warn(`Failed to save contact ${contact.name} (${contact.number}):`, error.message);
        }
      }

      logger.info(`Sync complete - New: ${savedCount}, Updated: ${updatedCount}, Total: ${contacts.length}`);

      return {
        success: true,
        synced: savedCount,
        updated: updatedCount,
        total: contacts.length,
        message: `${savedCount} yeni kişi eklendi, ${updatedCount} kişi güncellendi`
      };
    } catch (error) {
      logger.error(`Error syncing contacts for session ${sessionId}:`, error);
      return {
        success: false,
        synced: 0,
        error: 'Senkronizasyon başarısız'
      };
    }
  }

  /**
   * Get groups
   * @param {string} sessionId
   */
  async getGroups(sessionId) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const chats = await client.getChats();
      const groups = chats.filter(c => c.isGroup);

      const mappedGroups = await Promise.all(
        groups.map(async (group) => {
          const participants = group.participants || [];
          let profilePicUrl = null;

          try {
            profilePicUrl = await group.getProfilePicUrl();
          } catch (error) {
            // Profile pic might not be available
          }

          return {
            id: group.id._serialized,
            name: group.name,
            description: group.description,
            createdAt: group.createdAt,
            owner: group.owner,
            participantCount: participants.length,
            participants: participants.map(p => ({
              id: p.id._serialized,
              isAdmin: p.isAdmin,
              isSuperAdmin: p.isSuperAdmin
            })),
            profilePicUrl
          };
        })
      );

      return {
        total: mappedGroups.length,
        groups: mappedGroups
      };
    } catch (error) {
      logger.error(`Error fetching groups from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Handle contact change event
   * @param {string} sessionId
   * @param {string} oldId
   * @param {string} newId
   * @param {boolean} isContact
   */
  async handleContactChange(sessionId, oldId, newId, isContact) {
    logger.info(`Contact changed in session ${sessionId}: ${oldId} -> ${newId}, isContact: ${isContact}`);

    // Invalidate cache
    this.contactsCache.delete(sessionId);

    // Emit event for real-time updates
    process.nextTick(() => {
      SessionManager.emit('contact_update', {
        sessionId,
        oldId,
        newId,
        isContact,
        timestamp: new Date()
      });
    });
  }

  /**
   * Get presence (online status)
   * @param {string} sessionId
   * @param {string} phoneNumber
   */
  async getPresence(sessionId, phoneNumber) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const contactId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      const chat = await client.getChatById(contactId);

      if (!chat) {
        throw new Error('Chat not found');
      }

      const presence = await chat.getPresence();

      return {
        phoneNumber,
        isOnline: presence === 'available',
        lastSeen: chat.lastMessage ? chat.lastMessage.timestamp : null
      };
    } catch (error) {
      logger.error(`Error getting presence for ${phoneNumber} in session ${sessionId}:`, error);
      throw error;
    }
  }
}

module.exports = new ContactManager();