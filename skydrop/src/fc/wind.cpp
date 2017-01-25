/*
 * wind2.cpp
 *
 *  Created on: Jan 23, 2017
 *      Author: fiala
 */

#include "wind.h"
#include "fc.h"
#include "../common.h"

float atan2(float x, float y)
{	// calculates atan2, returns: angle in deg, range < 0 ; 360 ), max error 0.162 deg
	if(x < 0 and y == 0)   	return 270.0;
    if(x > 0 and y == 0)   	return 90.0;
    if(x == 0 and y == 0)   return (-1.0);//error condition
    if(x == 0 and y > 0)    return 0.0;
    if(x == 0 and y < 0)    return 180.0;

    ///arctan aproximation
    float fi = fabs( x / y );
    float fi2 = fi * fi;
    fi = ((0.596227 * fi + fi2) / (1 + 2 * 0.596227 * fi + fi2 )) * 90;

    /// cover all quadrants
    if(x >= 0 and y > 0)   	return (fi);
    if(x < 0 and y > 0)    	return (360.0 - fi);
    if(x >= 0 and y < 0)   	return (180.0 - fi);
    if(x < 0 and y < 0)    	return (fi + 180.0);
//  if(x < 0 and y == 0)   	return (fi - 180.0);
    return (-1.0); //error condition
}

void wind_new_gps_fix()
{
	DEBUG("Wind step 1");
	float currLon = float(fc.gps_data.longtitude) / 10000000.0;
	float currLat = float(fc.gps_data.latitude) / 10000000.0;
	float dX = (currLon - fc.wind.old_gps.X);
	float dY = (currLat  - fc.wind.old_gps.Y);
	fc.wind.old_gps.X = currLon;
	fc.wind.old_gps.Y = currLat;

	float speed = sqrt(dX*dX + dY*dY) * 111317.099692198;
	float angle = atan2(dX,dY);

	uint8_t sector = int( angle + (360 / number_of_sectors / 2 )) % 360 / (360 / number_of_sectors);

	fc.wind.dir[sector] = angle;
	fc.wind.spd[sector] = speed;
	DEBUG(" 2");
	if(sector == (fc.wind.old_sector+1)%number_of_sectors)
	{	//clockwise move
		if(fc.wind.sectors_cnt >= 0)
			fc.wind.sectors_cnt += 1;
		else
			fc.wind.sectors_cnt = 0;
	}
	else if(fc.wind.old_sector == (sector+1)%number_of_sectors)
	{	//counterclockwise move
		if(fc.wind.sectors_cnt <=0 )
			fc.wind.sectors_cnt -=1;
		else
			fc.wind.sectors_cnt = 0;
	}
	else if(fc.wind.old_sector == sector)
	{	//same sector
	}
	else //more than (360 / number_of_sectors), discart data
		fc.wind.sectors_cnt = 0;
	fc.wind.old_sector = sector;
	DEBUG(" 3 cnt=%d sec=%d", fc.wind.sectors_cnt, sector );


	int8_t min = 0;
	int8_t max = 0;
	float old_spd;
	if( abs( fc.wind.sectors_cnt) >= number_of_sectors)
	{
		DEBUG(" 4");
		for( int i = 0 ; i <= number_of_sectors ; i++ )
		{
			DEBUG(" for%d",i);
			if (i == 0)
			{
				old_spd = fc.wind.spd[i];
				continue;
			}

			if (fc.wind.spd[i] > old_spd)	max = i;
			if (fc.wind.spd[i] < old_spd)   min = i;
			old_spd = fc.wind.spd[i];
		}

		int8_t sectorDiff = abs(max-min);
		if (sectorDiff >= ( number_of_sectors/2-1 ) && sectorDiff <= ( number_of_sectors/2 +1) )
		{
			fc.wind.speed = (fc.wind.spd[max] - fc.wind.spd[min]) / 2;
			fc.wind.direction = fc.wind.dir[max];
			//fc.wind.direction = fc.wind.dir[min];
        	fc.wind.valid = true;
        	DEBUG(" 5");
		}

		DEBUG(" 6");

	}

	DEBUG(" end\n");
}

void wind_init()
{
	for(int i=0 ; i < number_of_sectors ; i++)
	{
		fc.wind.spd[i];
		fc.wind.dir[i];
	}
	fc.wind.sectors_cnt = 0;
	fc.wind.old_sector = 0;
	fc.wind.valid = false;
	DEBUG("wind_init\n");
}

void wind_step()
{
	if (fc.gps_data.new_sample & FC_GPS_NEW_SAMPLE_WIND)
	{

		wind_new_gps_fix();

		fc.gps_data.new_sample &= ~FC_GPS_NEW_SAMPLE_WIND;
	}
}
