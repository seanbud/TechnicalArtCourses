# Lesson 06: Data Strategy

## The Digital Landfill

Data has "Gravity." The more you have, the harder it is to move, search, or manage.
A motion capture stage is a firehose of data. We can generate Terabytes of raw video reference every single day.
If you simply dump this onto a hard drive, you are building a digital landfill. Within a month, nobody will be able to find anything, and you will run out of space.

We need a **Data Lifecycle Strategy**.

## Tiered Storage

Not all data is equal. A file you are working on *right now* is valuable. A file from 3 years ago is (probably) not.
We match the value of the data to the cost of the storage media:

1.  **Tier 1 (Hot):** NVMe Flash Storage. Extremely fast, extremely expensive. This is for active production use.
2.  **Tier 2 (Warm):** Spinning Disks (NAS). Slower, cheaper capacity. This is for daily backups and recent history.
3.  **Tier 3 (Cold):** Tape or Cloud Archive (AWS Glacier). Incredibly slow to retrieve (hours), but dirt cheap. This is for finished projects.

Your job as a TA involves writing the "Sweeper" scripts that automatically move data down these tiers as it ages, keeping the expensive Tier 1 storage free for active work.

## Validation: MD5 Hashing

When you move data—especially 100GB files—things can break. A "Bit Flip" occurs when a 0 turns into a 1 during transmission. In a video file, it's a glitch. In a binary asset, it can corrupt the entire file.

To prevent this, we use **MD5 Checksums**.
We calculate a mathematical "fingerprint" of the file before we send it. We calculate it again after it arrives. If the fingerprints match, the data is perfect. If not, we know corruption occurred and we must retry.
We never trust the operating system's copy command blindly. We verify everything.

## The Sidecar Database

How do you find a specific file in a sea of 10 million assets?
You don't use the file system. Windows Explorer or `ls` will hang if you try to list a folder with that many files.
We use a **SQL Database** (like SQLite or PostgreSQL) to track our assets.
We store metadata: "Shot Name," "Date," "Actor Name," "File Path," and "Hash."
Querying the database takes milliseconds. Scanning the drive takes hours.

## EA Relevance: Dead Space Audio

For *Dead Space*, the audio team recorded thousands of uncompressed, high-fidelity sounds. The library was massive. By implementing a Tiered Storage system, we kept the active sound effects on the fast servers while automatically archiving the unused takes to cold storage. This simple script saved the studio tens of thousands of dollars in storage equipment costs per year. It's not glamorous work, but it pays the bills.

## Key Takeaways

*   **Lifecycle Management:** Data must move from Hot to Cold storage as it ages.
*   **Verification:** Always use Hashing (MD5) to prove data integrity during transfers.
*   **Metadata:** Use a SQL database to track files. The file system is not a database.
*   **Naming Schemas:** Strict naming conventions are the key to making data searchable and sortable.

Next, we'll wrap up with the high-level perspective: **System Design & Leadership**.
