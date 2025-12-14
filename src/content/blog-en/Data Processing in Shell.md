---
description: Data Processing in Shell
pubDate: '2021-10-07'
tags:
- DataCamp
- Shell
title: Data Processing in Shell
---

#### Downloading Data with `curl`

`curl` (Client for URLs) transfers data to and from servers. It’s commonly used to download files from HTTP sites and FTP servers, although it supports many other protocols.

Check whether `curl` is installed:

```shell
man curl
```

- If you see `curl command not found`, install it first.  
- When it is installed, the manual page displays sections such as Name, Synopsis, and Description.  
- Press Enter to move through the manual and `q` to quit.

Basic syntax:

```shell
curl [option flags] [URL]
```

`curl` supports HTTP, HTTPS, FTP, SFTP, and more.

```shell
curl -O https://websitename.com/datafilename.txt

# Save with a different name
curl -o renamedatafilename.txt https://websitename.com/datafilename.txt
```

Download multiple files with wildcards:

```shell
curl -O https://websitename.com/datafilename*.txt
curl -O https://websitename.com/datafilename[001-100].txt
curl -O https://websitename.com/datafilename[001-100:10].txt
```

Useful flags:

- `-L`: follow redirects (HTTP 3xx).  
- `-C`: resume a transfer that was interrupted.

```shell
curl -L -O -C - https://websitename.com/datafilename[001-100].txt
```

<br>

#### Downloading Data with `wget`

`wget` (“web get”) is a versatile downloader that can fetch single files, entire folders, or whole web pages. It supports recursive downloads.

Locate `wget`:

```shell
which wget
# returns nothing if it's not installed
```

Install:

```shell
# Linux
sudo apt-get install wget

# macOS
brew install wget

# Windows
Install it via the GnuWin32 package.
```

Basic usage:

```shell
wget [option flags] [URL]
```

Common flags:

- `-b`: run the download in the background.  
- `-q`: quiet mode (suppress output).  
- `-c`: resume a partial download.

```shell
wget -bqc https://websitename.com/datafilename.txt
```

<br>

#### Advanced Downloading with `wget`

Download every URL listed in a file:

```shell
cat url_list.txt
wget -i url_list.txt
```

Limit the transfer rate (`--limit-rate` is bytes per second, so append `k` for kilobytes):

```shell
wget --limit-rate=200k -i url_list.txt
```

Add delays between requests:

```shell
wget --wait=2.5 -i url_list.txt
```

<br>

#### Getting Started with `csvkit`

Install the toolkit:

```shell
pip install csvkit
```

View help:

```shell
in2csv --help
in2csv -h
```

Convert Excel to CSV:

```shell
in2csv SpotifyData.xlsx > SpotifyData.csv

# Print the first sheet to stdout without saving
in2csv SpotifyData.xlsx

in2csv -n SpotifyData.xlsx                            # list sheet names
in2csv SpotifyData.xlsx --sheet "Worksheet1_Popularity" > Spotify_Popularity.csv
```

`csvlook` pretty-prints CSV data:

```shell
csvlook -h
csvlook Spotify_Popularity.csv
```

Summaries with `csvstat`:

```shell
csvstat Spotify_Popularity.csv
```

<br>

#### Filtering Data with `csvkit`

```shell
csvcut -h
csvcut -n Spotify_MusicAttributes.csv                     # show column indices
csvcut -c 1 Spotify_MusicAttributes.csv
csvcut -c "track_id" Spotify_MusicAttributes.csv
csvcut -c 2,3 Spotify_MusicAttributes.csv
csvcut -c "danceability","duration_ms" Spotify_MusicAttributes.csv
```

`csvgrep` filters rows:

```shell
csvgrep -h
csvgrep -c "track_id" -m 5RCPsfzmEpTXMCTNk7wEfQ Spotify_MusicAttributes.csv
csvgrep -c 1 -m 5RCPsfzmEpTXMCTNk7wEfQ Spotify_MusicAttributes.csv
```

<br>

#### Stacking Data and Chaining Commands with `csvkit`

```shell
csvstack -h

# Stack files with identical columns
csvstack Spotify_Rank6.csv Spotify_Rank7.csv > Spotify_AllRanks.csv

csvstack -g "Rank6","Rank7" Spotify_Rank6.csv Spotify_Rank7.csv > Spotify_AllRanks.csv

csvstack -g "Rank6","Rank7" -n "source" Spotify_Rank6.csv Spotify_Rank7.csv > Spotify_AllRanks.csv

# Commands separated with ; run sequentially
csvlook SpotifyData_All.csv; csvstat SpotifyData_All.csv

# Commands joined with && execute the second only if the first succeeds
csvlook SpotifyData_All.csv && csvstat SpotifyData_All.csv

csvcut -c "track_id","danceability" Spotify_Popularity.csv | csvlook
```

<br>

#### Pulling Data from Databases

`sql2csv` can export results from popular SQL databases.

```shell
sql2csv -h

sql2csv --db "sqlite:///SpotifyDatabase.db" \
        --query "SELECT * FROM Spotify_Popularity" \
        > Spotify_Popularity.csv
```

<br>

#### Manipulating Data with SQL Syntax

```shell
csvsql --query "SELECT * FROM Spotify_MusicAttributes LIMIT 1" Spotify_MusicAttributes.csv

csvsql --query "SELECT * FROM Spotify_MusicAttributes LIMIT 1" \
        data/Spotify_MusicAttributes.csv | csvlook

csvsql --query "SELECT * FROM Spotify_MusicAttributes LIMIT 1" \
        data/Spotify_MusicAttributes.csv > OneSongFile.csv

csvsql --query "SELECT * FROM file_a INNER JOIN file_b ..." file_a.csv file_b.csv
```

<br>

#### Pushing Data Back to a Database

```shell
csvsql --db "sqlite:///SpotifyDatabase.db" \
        --insert Spotify_MusicAttributes.csv

csvsql --no-inference --no-constraints \
        --db "sqlite:///SpotifyDatabase.db" \
        --insert Spotify_MusicAttributes.csv
```

<br>

#### Python on the Command Line

```shell
man python

python --version          # check the Python version
which python              # find the interpreter path

python
>>> print("hello world")
>>> exit()

echo "print('hello world')" > hello_world.py
```

<br>

#### Installing Python Packages with `pip`

```shell
pip install --upgrade pip
pip list                               # show installed packages

pip install scikit-learn
pip install scikit-learn==0.19.2
pip install --upgrade scikit-learn

pip install scikit-learn statsmodels
pip install --upgrade scikit-learn statsmodels

cat requirements.txt
pip install -r requirements.txt
```

<br>

#### Automating Data Jobs with `cron`

```shell
crontab -l                        # list scheduled jobs
man crontab
echo "* * * * * python create_model.py" | crontab
```
